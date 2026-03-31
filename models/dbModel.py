import oracledb
from dotenv import load_dotenv
import os
import platform
from flask import session
# import pandas as pd
# from datetime import datetime, timedelta

load_dotenv()  # Load environment variables from .env file
        
if platform.system() == "Windows":
    oracledb.init_oracle_client(lib_dir="C:/instantclient_23_0")
else:
    oracledb.init_oracle_client()



class ProductDB:
    # # Enable thick mode
    # try:
    #     print("Trying to connect to Database...")
    #     conn = oracledb.connect(user= os.getenv("DB_USER"),
    #                             password= os.getenv("DB_PASSWORD"), 
    #                             dsn= os.getenv("DB_DSN"))
    #     print("Connected successfully..!")
    #     conn.close()
    # except oracledb.DatabaseError as e:
    #     print("Connection failed:", e)
    
    # Initialize the DB manager with Oracle connection details.
    
    def __init__(self, user=os.getenv("DB_USER"), password=os.getenv("DB_PASSWORD"), dsn=os.getenv("DB_DSN")):
        """Initializes the database manager with connection details."""
        self.user = user
        self.password = password
        self.dsn = dsn

    # Internal method to get a database connection
    def _get_connection(self):
        """Creates and returns a new database connection."""
        return oracledb.connect(user=self.user, password=self.password, dsn=self.dsn)

    def get_dashboard_stats(self):
        """
        Retrieves and formats statistics for the dashboard.
        Note: Currently returns mocked data.
        """
        data = {
            "user_name": session['full_name'],
            
            # Operational Health
            "system_health": "Healthy",
            "verifications_today": "1,284",
            "suspicious_ratio": "3.2%",
            "peak_hour": "214",

            # Trends
            "trend_today": "1,284",
            "trend_week": "8,942",
            "trend_month": "36,517",

            # Breakdown
            "genuine_count": "28,745",
            "invalid_count": "1,132",
            "repeated_count": "2,418",
            "total_generated": "32,295",

            # Suspicious Snapshot
            "repeated_attempts": "417",
            "ip_spamming": "89",
            "high_risk_events": "31",

            # List: Hot Products
            "hot_products": [
                {"name": "Alatrol", "batch": "NXA-2407", "scans": "3,214"},
                {"name": "Seclo 20", "batch": "SCL-1123", "scans": "2,879"},
                {"name": "ACE Plus", "batch": "ACP-0824", "scans": "2,156"},
                {"name": "Fexo 120", "batch": "FXO-0524", "scans": "1,942"},
                {"name": "Napa Extend", "batch": "NPX-9901", "scans": "1,504"}
            ],

            # List: Recent Verifications
            "recent_verifications": [
                {"time": "10:42", "code": "HKUV679K11", "status": "Genuine", "status_class": "text-success", "description": "verified"},
                {"time": "10:40", "code": "QWEU982L77", "status": "Repeated", "status_class": "text-warning", "description": "already used"},
                {"time": "10:36", "code": "ASD8892XX", "status": "Invalid", "status_class": "text-danger", "description": "attempt"},
                {"time": "10:31", "code": "MXP9921KL", "status": "Genuine", "status_class": "text-success", "description": "verified"},
                {"time": "10:28", "code": "BVC1234ZZ", "status": "Invalid", "status_class": "text-danger", "description": "attempt"}
            ],

            # List: Admin Actions
            "admin_actions": [
                {"time": "09:58", "text": "Generated <strong>1,000</strong> codes", "status": "Admin", "status_class": ""},
                {"time": "09:41", "text": "Disabled suspicious IP <strong>103.45.xx.xx</strong>", "status": "Security", "status_class": "text-danger"},
                {"time": "09:12", "text": "Assigned batch <strong>NXA-2407</strong>", "status": "System", "status_class": ""}
            ]
        }

        return data
    


    def login(self, username, password):
        """
        Authenticates a user against the database by calling the
        `verify_user_login_prc` stored procedure.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            o_user_id = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_full_name = cursor.var(oracledb.DB_TYPE_VARCHAR)
            o_role = cursor.var(oracledb.DB_TYPE_VARCHAR)
            o_emp_id = cursor.var(oracledb.DB_TYPE_VARCHAR)
            o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)

            cursor.callproc(
                "verify_user_login_prc",
                [
                    username,
                    password,
                    o_user_id,
                    o_full_name,
                    o_role,
                    o_emp_id,
                    o_status_code,
                    o_status_msg
                ]
            )
            result = {
                "user_id": o_user_id.getvalue(),
                "full_name": o_full_name.getvalue(),
                "role": o_role.getvalue(),
                "status_code": o_status_code.getvalue(), # 1 for success, 0 for failure
            }
            return result
        
        except Exception as e:
            print("Authentication failed:", e)
            return {"status_code": -1, "error": str(e)}
        
        finally:
            cursor.close()
            conn.close()

    
    def get_user_email(self, username):
        """
        Retrieves a user's email from the database by calling the
        `verify_user_get_email_prc` stored procedure.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            o_user_email = cursor.var(oracledb.DB_TYPE_VARCHAR)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)

            cursor.callproc(
                "verify_user_get_email_prc",
                [
                    username,
                    o_user_email,
                    o_status_msg
                ]
            )
            result =  { "user_email":o_user_email.getvalue(), "status":o_status_msg.getvalue()}          
            return result
        except Exception as e:
            print("Failed:", e)
            return {'user_id': None}
        finally:
            cursor.close()
            conn.close()
      
    def register_user(self, username, full_name, employee_id, phone, role, password, email, mode):
        """
        Registers a new user in the database by calling the
        `verify_user_reg_prc` stored procedure.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            o_user_id = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)
            created_by = "SELF"
            #one line if:
            mode = 'O' if mode == "otp" else 'S'

            cursor.callproc(
                "verify_user_reg_prc",
                [
                    str(username),
                    str(employee_id),
                    str(email),
                    str(password),
                    str(full_name),
                    str(phone),
                    str(role),
                    str(created_by),
                    str(mode),
                    o_user_id,
                    o_status_msg
                ]
            )
            result = {'user_id': o_user_id.getvalue()}
            return result
                
        except Exception as e:
            print("User registration failed:", e)
            return {'user_id': None}
        finally:
            cursor.close()
            conn.close()


    def reset_password(self, username, new_password, confirm_password):
        """
        Resets a user's password by calling the
        `verify_user_forgot_pwd_prc` stored procedure.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            o_user_id = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)

            cursor.callproc(
                "verify_user_forgot_pwd_prc",
                [
                    username,
                    new_password,
                    confirm_password,
                    o_user_id,
                    o_status_code,
                    o_status_msg
                ]
            )
            status_code = o_status_code.getvalue()
            
            if status_code == 1:
                print("Password reset successful")
                return True, o_status_msg.getvalue()
            else:
                print("Password reset failed:", o_status_msg.getvalue())
                return False, o_status_msg.getvalue()
            
        except Exception as e:
            print("Password reset failed:", e)
            return False, "An error occurred while resetting the password."
        finally:
            cursor.close()
            conn.close()
    

    def assign_batch(self, lot_number, product_code, product_name, username):
        """
        Assigns product details to a lot by calling the
        `INSERT_PRODUCT_AUTH_MASTER` stored procedure.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            
            P_GENERIC = cursor.var(oracledb.DB_TYPE_VARCHAR)
            P_BATCH = cursor.var(oracledb.DB_TYPE_VARCHAR)
            P_MNF_DATE = cursor.var(oracledb.DB_TYPE_DATE)
            P_EXP_DATE = cursor.var(oracledb.DB_TYPE_DATE)
            P_BATCH_SIZE = cursor.var(oracledb.DB_TYPE_NUMBER)
            P_UOM = cursor.var(oracledb.DB_TYPE_VARCHAR)
            o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)

            cursor.callproc(
                "INSERT_PRODUCT_AUTH_MASTER",
                [
                    lot_number,
                    int(product_code),
                    P_GENERIC,
                    product_name,
                    P_BATCH,
                    P_MNF_DATE,
                    P_EXP_DATE,
                    P_BATCH_SIZE,
                    P_UOM,
                    username,
                    o_status_code,
                    o_status_msg
                ]
            )

            status_code = o_status_code.getvalue()
            status_msg = o_status_msg.getvalue()
            return status_code, status_msg

        except Exception as e:
            print("Batch assignment failed:", e)
            return 0, "An error occurred while assigning the batch."
        finally:
            cursor.close()
            conn.close()


    def get_lot_code_count(self, lot_no):
        """
        Retrieves the number of available codes for a given lot number by
        calling the `get_lot_size` database function.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # callfunc requires: (function_name, return_type, [parameters])
            lot_size = cursor.callfunc(
                "get_lot_size",
                oracledb.DB_TYPE_NUMBER,  # Expected return type from the DB
                [lot_no]             # Input parameter(s) wrapped in a list
            )
            if lot_size is not None:
                result = {"lot_number": lot_no.upper(), "available_codes": int(lot_size)}
                return result
            
            return None
        except Exception as e:
            print(f"Failed to retrieve lot size for lot {lot_no}:", e)
            return None  # Or whatever error fallback makes sense for your app
            
        finally:
            cursor.close()
            conn.close()    
    

    def export_batch_codes(self, batchNumber):
        """
        Exports all security codes associated with a given batch number.
        Note: Currently returns mocked data.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Simulate fetching codes for the batch
            codes = [f"CODE-{i:05d}" for i in range(1, 1001)]  # Example: 1000 codes
            return codes

        except Exception as e:
            print("Batch code export failed:", e)
            return []
        finally:
            cursor.close()
            conn.close()


    def export_batch_summary(self, batchNumber):
        """
        Exports a summary for a given batch number.
        Note: Currently returns a mocked filename.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            filename = f"batch_{batchNumber}"
            return filename

        except Exception as e:
            print("Batch summary export failed:", e)
            return None

        finally:
            cursor.close()
            conn.close()


    def export_batch_full(self, batchNumber):
        """
        Exports the full details for a given batch number.
        Note: Currently returns a mocked filename.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            filename = f"batch_{batchNumber}"
            return filename

        except Exception as e:
            print("Batch full export failed:", e)
            return None
        finally:
            cursor.close()
            conn.close()


    def generate_codes(self,quantity, username):
        """
        Generates a specified quantity of new scratch codes by calling the
        `GEN_SCRATCH_CODE` stored procedure.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            batch_no = ""
            o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)
            o_lot_no = cursor.var(oracledb.DB_TYPE_VARCHAR)
            cursor.callproc(
              #  "GEN_SCRATCH_CODE_test", for testing
                "GEN_SCRATCH_CODE",
                [   
                    username,
                    quantity,
                    o_status_code,
                    o_status_msg,
                    o_lot_no
                ]
            )
            status_code= o_status_code.getvalue()
            status_msg = o_status_msg.getvalue()
            lot_no = o_lot_no.getvalue()
            return status_code, status_msg, lot_no
        except Exception as e:
            print("Code generation failed:", e)
            return 0, "An error occurred while generating codes.", None
        finally:
            cursor.close()
            conn.close()


    def get_code_summary(self):
        """
        Retrieves a summary of total, available, and used codes from the
        `PRODUCT_AUTH` table.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            o_total_codes = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_available_codes = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_used_codes = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)

            cursor.callproc(
                "EMD_SYS.get_code_statistics",
                [
                    o_total_codes,
                    o_available_codes,
                    o_used_codes,
                    o_status_code,
                    o_status_msg
                ]
            )

            status_code = o_status_code.getvalue()
            status_msg = o_status_msg.getvalue()
            if status_code != 1:
                print(f"Failed to retrieve code summary: {status_msg}")
                return {"total": 0, "available": 0, "used": 0}

            return {
                "total": int(o_total_codes.getvalue() or 0),
                "available": int(o_available_codes.getvalue() or 0),
                "used": int(o_used_codes.getvalue() or 0)
            }

        except Exception as e:
            print(f"Failed to retrieve code summary: {e}")
            return None
        finally:
            cursor.close()
            conn.close()



    def get_scratch_codes(self, lot_number):
        """
        Fetches all scratch codes associated with a specific lot number by calling
        the `EMD_SYS.get_scratch_codes` database function.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            # Call the function and get the returned REF CURSOR
            ref_cursor = cursor.callfunc("EMD_SYS.get_scratch_codes", oracledb.DB_TYPE_CURSOR, [lot_number])

            codes = []
            # Fetch results from the REF CURSOR
            if ref_cursor:
                for row in ref_cursor:
                    # Assuming the function returns a single column 'SCRATCH_CODE'
                    codes.append({
                        "scratch_code": row[0]
                    })
            
            # Handle the 'NOT FOUND' case where the function returns a single row with 'NOT FOUND'
            if len(codes) == 1 and codes[0]["scratch_code"] == 'NOT FOUND':
                return []

            return codes

        except Exception as e:
            print(f"Failed to retrieve scratch codes for lot {lot_number}: {e}")
            return None
        finally:
            # Clean up connections
            cursor.close()
            conn.close()

    def search_codes(self, search_type, query):
        """
        Searches for code or batch details in the `PRODUCT_AUTH` table
        based on the provided query and search type.
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        # 'batch' = lot_no (type varchar2)
        try:
            if search_type == 'batch':
                o_cursor = cursor.var(oracledb.DB_TYPE_CURSOR)
                o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
                o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)

                cursor.callproc(
                    "EMD_SYS.get_lot_scratch_summary",
                    [
                        query,
                        o_cursor,
                        o_status_code,
                        o_status_msg
                    ]
                )

                status_code = o_status_code.getvalue()
                status_msg = o_status_msg.getvalue()
                ref_cursor = o_cursor.getvalue()

                if status_code != 1:
                    print(f"Batch summary procedure failed for lot {query}: {status_msg}")
                    return None

                row = None
                if ref_cursor:
                    row = ref_cursor.fetchone()

                if row:
                    return {
                        'type': 'batch_summary',
                        'data': {
                            'Lot Number': row[0],
                            'Product Name': row[1] if row[1] else 'N/A',
                            'Product Code': row[2] if row[2] else 'N/A',
                            'Assigned Batch Number': row[3] if row[3] else 'Unassigned',
                            'Total Codes': row[4],
                            'Used Codes': row[5],
                            'Available Codes': row[6]
                        }
                    }
                return None
            elif search_type == 'code':
                o_cursor = cursor.var(oracledb.DB_TYPE_CURSOR)
                o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
                o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)

                cursor.callproc(
                    "EMD_SYS.get_scratch_code_details",
                    [
                        query,
                        o_cursor,
                        o_status_code,
                        o_status_msg
                    ]
                )

                status_code = o_status_code.getvalue()
                status_msg = o_status_msg.getvalue()
                ref_cursor = o_cursor.getvalue()

                if status_code != 1:
                    print(f"Scratch code details procedure failed for code {query}: {status_msg}")
                    return None

                row = None
                if ref_cursor:
                    row = ref_cursor.fetchone()

                if row:
                    details = {
                        'Scratch Code': row[0],
                        'Lot Number': row[1] if row[1] else 'N/A',
                        'Assigned Batch Number': row[2] if row[2] else 'Unassigned',
                        'Product Name': row[3] if row[3] else 'N/A',
                        'Product Code': row[4] if row[4] else 'N/A',
                        'Manufacture Date': row[5].strftime('%Y-%m-%d') if row[5] else 'N/A',
                        'Expiry Date': row[6].strftime('%Y-%m-%d') if row[6] else 'N/A',
                        'Number of Checks': row[7] if row[7] is not None else 0,
                        'Generated On': row[8].strftime('%Y-%m-%d %H:%M:%S') if row[8] else 'N/A',
                        'Last Check Location': row[9] if row[9] else 'N/A',
                        'Generic': row[10] if row[10] else 'N/A',
                        'Manufacturer': row[11] if row[11] else 'N/A',
                        'MAC': row[12] if row[12] else 'N/A',
                        'Created By': row[13] if row[13] else 'N/A',
                        'Updated By': row[14] if row[14] else 'N/A',
                        'Updated Date': row[15].strftime('%Y-%m-%d %H:%M:%S') if row[15] else 'N/A'
                    }
                    return {
                        'type': 'code_details',
                        'data': details
                    }
                return None
            else:
                return None
        except Exception as e:
            print(f"Error searching codes: {e}")
            return None
        finally:
            cursor.close()
            conn.close()





        # def get_dashboard_stats(self):
    #     conn = self._get_connection()
    #     cursor = conn.cursor()
    #     try:
    #         # Fetch raw data using oracledb
    #         sql = "SELECT NOC, CREATED_DATE, PROD_NAME, BATCH_NO, SCRATCH_CODE FROM PRODUCT_AUTH"
    #         cursor.execute(sql)
    #         rows = cursor.fetchall()
    #         columns = [desc[0] for desc in cursor.description] # type: ignore
            
    #         # Load into a pandas DataFrame
    #         df = pd.DataFrame(rows, columns=columns)

    #         # Ensure CREATED_DATE is a datetime object
    #         df['CREATED_DATE'] = pd.to_datetime(df['CREATED_DATE'])

    #         # --- Calculations ---
    #         now = datetime.now()
    #         today_start = datetime(now.year, now.month, now.day)
            
    #         total_generated = len(df)
            
    #         verified_df = df[df['NOC'] > 0]
    #         total_verifications = len(verified_df)
            
    #         repeated_df = df[df['NOC'] > 1]
    #         repeated_count = len(repeated_df)

    #         genuine_count = total_verifications - repeated_count

    #         # Trends
    #         verifications_today = len(verified_df[verified_df['CREATED_DATE'] >= today_start])
    #         trend_week = len(verified_df[verified_df['CREATED_DATE'] >= now - timedelta(days=7)])
    #         trend_month = len(verified_df[verified_df['CREATED_DATE'] >= now - timedelta(days=30)])

    #         # Suspicious ratio
    #         suspicious_ratio = f"{(repeated_count / total_verifications * 100):.1f}%" if total_verifications > 0 else "0.0%"

    #         # Hot products
    #         hot_products = df[(df['PROD_NAME'].notna()) & (df['NOC'] > 0)] \
    #             .groupby(['PROD_NAME', 'BATCH_NO']) \
    #             .size() \
    #             .nlargest(5) \
    #             .reset_index(name='SCANS') \
    #             .rename(columns={'PROD_NAME': 'name', 'BATCH_NO': 'batch', 'SCANS': 'scans'}) \
    #             .to_dict('records')

    #         # Recent verifications
    #         recent_verifications_df = verified_df.sort_values(by='CREATED_DATE', ascending=False).head(5)
    #         recent_verifications = []
    #         for index, row in recent_verifications_df.iterrows():
    #             status, s_class, desc = ("Genuine", "text-success", "verified") if row['NOC'] == 1 else ("Repeated", "text-warning", "already used")
    #             recent_verifications.append({
    #                 "time": row['CREATED_DATE'].strftime('%H:%M'),
    #                 "code": row['SCRATCH_CODE'],
    #                 "status": status,
    #                 "status_class": s_class,
    #                 "description": desc
    #             })

    #         data = {
    #             "user_name": session.get('full_name', 'User'),
    #             "system_health": "Healthy",
    #             "verifications_today": f"{verifications_today:,}",
    #             "suspicious_ratio": suspicious_ratio,
    #             "peak_hour": "N/A",
    #             "trend_today": f"{verifications_today:,}",
    #             "trend_week": f"{trend_week:,}",
    #             "trend_month": f"{trend_month:,}",
    #             "genuine_count": f"{genuine_count:,}",
    #             "invalid_count": "N/A",
    #             "repeated_count": f"{repeated_count:,}",
    #             "total_generated": f"{total_generated:,}",
    #             "repeated_attempts": f"{repeated_count:,}",
    #             "ip_spamming": "N/A",
    #             "high_risk_events": "N/A",
    #             "hot_products": hot_products,
    #             "recent_verifications": recent_verifications,
    #             "admin_actions": [
    #                 {"time": "09:58", "text": "Generated <strong>1,000</strong> codes", "status": "Admin", "status_class": ""},
    #                 {"time": "09:41", "text": "Disabled suspicious IP <strong>103.45.xx.xx</strong>", "status": "Security", "status_class": "text-danger"},
    #             ]
    #         }
    #         return data
    #     except Exception as e:
    #         print(f"Error processing dashboard stats in Python: {e}")
    #         return None
    #     finally:
    #         cursor.close()
    #         conn.close()
