import oracledb
from dotenv import load_dotenv
import os
import platform
from flask import session

load_dotenv()  # Load environment variables from .env file
        
if platform.system() == "Windows":
    oracledb.init_oracle_client(lib_dir="C:/oracle/product/instantclient_23_9")
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
        self.user = user
        self.password = password
        self.dsn = dsn

    # Internal method to get a database connection
    def _get_connection(self):
        return oracledb.connect(user=self.user, password=self.password, dsn=self.dsn)

    def get_dashboard_stats(self):
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
    
    def check_username_exists(self, username):
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            o_exists = cursor.var(oracledb.DB_TYPE_NUMBER)
            cursor.callproc(
                "verify_username_exists_prc",
                [
                    username,
                    o_exists
                ]
            )
            return o_exists.getvalue() == 1  # Return True if user exists, False otherwise
        except Exception as e:
            print("User existence check failed:", e)
            return False  # Assume user doesn't exist on error
        finally:
            cursor.close()
            conn.close()

    def check_email_exists(self, email):
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            o_exists = cursor.var(oracledb.DB_TYPE_NUMBER)
            cursor.callproc(
                "verify_email_exists_prc",
                [
                    email,
                    o_exists
                ]
            )
            return o_exists.getvalue() == 1  # Return True if email exists, False otherwise
        except Exception as e:
            print("Email existence check failed:", e)
            return False  # Assume email doesn't exist on error
        finally:
            cursor.close()
            conn.close()

    
    def get_user_email(self, username):
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
      
    def register_user(self, username, full_name, employee_id, phone, role, password, email):
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            o_user_id = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)
            created_by = "SELF"

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
                    o_user_id,
                    o_status_msg
                ]
            )
            result = {'user_id': o_user_id.getvalue()}
            print("Status:", o_status_msg.getvalue())
            return result
                
        except Exception as e:
            print("User registration failed:", e)
            return {'user_id': None}
        finally:
            cursor.close()
            conn.close()


    def reset_password(self, username, new_password, confirm_password):
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
    

    def assign_batch(self, product_code, product_name, lot_number):
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)

            cursor.callproc(
                "INSERT_PRODUCT_AUTH_MASTER",
                [
                    product_code,
                    product_name,
                    lot_number,
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
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # callfunc requires: (function_name, return_type, [parameters])
            lot_size = cursor.callfunc(
                "get_lot_size",
                oracledb.DB_TYPE_NUMBER,  # Expected return type from the DB
                [lot_no]             # Input parameter(s) wrapped in a list
            )
            if lot_size != 0:
                result = {"lot_number": lot_no.upper(), "available_codes": lot_size} if lot_size is not None else None
                return result
            return None
        except Exception as e:
            print(f"Failed to retrieve lot size for lot {lot_no}:", e)
            return None  # Or whatever error fallback makes sense for your app
            
        finally:
            cursor.close()
            conn.close()    
    

    def export_batch_codes(self, batchNumber):
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


    def generate_codes(self,quantity):
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            batch_no = ""
            o_status_code = cursor.var(oracledb.DB_TYPE_NUMBER)
            o_status_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)
            cursor.callproc(
                "GEN_SCRATCH_CODE_TEST",
                [   
                    batch_no,
                    session['user_id'],
                    quantity,
                    o_status_code,
                    o_status_msg
                ]
            )
            status_code= o_status_code.getvalue()
            status_msg = o_status_msg.getvalue()
            return status_code, status_msg
        except Exception as e:
            print("Code generation failed:", e)
            return 0, "An error occurred while generating codes."
        finally:
            cursor.close()
            conn.close()


