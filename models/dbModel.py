import oracledb
from dotenv import load_dotenv
import os
import platform


class ProductDB:
    # Enable thick mode
    try:
        load_dotenv()  # Load environment variables from .env file
        
        if platform.system() == "Windows":
            oracledb.init_oracle_client(lib_dir="C:/oracle/product/instantclient_23_9")
        else:
            oracledb.init_oracle_client()
        
        print("Trying to connect to Database...")
        conn = oracledb.connect(user= os.getenv("DB_USER"),
                                password= os.getenv("DB_PASSWORD"), 
                                dsn= os.getenv("DB_DSN"))
        print("Connected successfully..!")
    except oracledb.DatabaseError as e:
        print("Connection failed:", e)
    
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
            "user_name": "Admin",  # You can pull this from session['user']
            
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


    def authenticate(self, username, password):
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            if username == "admin" and password == "admin123":
                return 25
            else:
                return None

        except Exception as e:
            print("Authentication failed:", e)
            return None

        finally:
            cursor.close()
            conn.close()
        
    # Call a stored procedure that returns multiple OUT parameters
    def get_authentication(self, input_str):
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Prepare OUT parameters
            p_status = cursor.var(oracledb.DB_TYPE_NUMBER)
            p_batch_no = cursor.var(oracledb.DB_TYPE_VARCHAR)
            p_prod_code = cursor.var(oracledb.DB_TYPE_VARCHAR)
            p_prod_name = cursor.var(oracledb.DB_TYPE_VARCHAR)
            p_mnf_dt = cursor.var(oracledb.DB_TYPE_VARCHAR)
            p_exp_dt = cursor.var(oracledb.DB_TYPE_VARCHAR)
            p_mnf_name = cursor.var(oracledb.DB_TYPE_VARCHAR)
            p_noc = cursor.var(oracledb.DB_TYPE_NUMBER)
            p_msg = cursor.var(oracledb.DB_TYPE_VARCHAR)
            p_remark = cursor.var(oracledb.DB_TYPE_VARCHAR)

            # Call the stored procedure
            cursor.callproc(
                "PR_VERIFY_AND_MARK_SCRATCH",  # procedure name in your Oracle DB
                [
                    input_str,
                    p_status,
                    p_batch_no,
                    p_prod_code,
                    p_prod_name,
                    p_mnf_dt,
                    p_exp_dt,
                    p_mnf_name,
                    p_noc,
                    p_msg,
                    p_remark
                ]
            )

            result = {
                "status": p_status.getvalue(),
                "batch_no": p_batch_no.getvalue(),
                "prod_code": p_prod_code.getvalue(),
                "prod_name": p_prod_name.getvalue(),
                "mnf_date": p_mnf_dt.getvalue(),
                "exp_date": p_exp_dt.getvalue(),
                "mnf_name": p_mnf_name.getvalue(),
                "noc": int(p_noc.getvalue()) if p_noc.getvalue() is not None else None,
                "msg": p_msg.getvalue(),
                "remark": p_remark.getvalue()
            }

            return result

        except Exception as e:
            print("Database function call failed:", e)
            return {"status": "E", "msg": str(e)}

        finally:
            cursor.close()
            conn.close()