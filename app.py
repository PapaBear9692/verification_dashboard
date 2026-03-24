import pandas as pd
from io import BytesIO
from flask import send_file
from datetime import datetime
import time
import os
from flask import Flask, jsonify, redirect, render_template, request, url_for, url_for, session
from flask_mail import Mail
from models.dbModel import ProductDB
from models.otpModel import OTPModel
from dotenv import load_dotenv


app = Flask(__name__)
load_dotenv()
app.secret_key = os.getenv("APP.SECRET") 

# --- Configure Flask-Mail ---
app.config['MAIL_SERVER'] = os.getenv("MAIL_SERVER")
app.config['MAIL_PORT'] = int(os.getenv("MAIL_PORT")) # type: ignore
app.config['MAIL_USE_TLS'] = os.getenv("MAIL_USE_TLS") == "True"
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = os.getenv("MAIL_DEFAULT_SENDER")

mail = Mail(app)

# Initialize database and OTP models
db = ProductDB()
otp = OTPModel(mail=mail)


# -------------Landing Page--------------
@app.route('/', methods=['GET'])
def welcome():
    return render_template('welcome.html')

# -------------Authentication--------------
@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')
    
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    result = db.login(username, password)
    if result["status_code"] == 1:
        session["login"] = True
        session["user_id"] = result["user_id"]
        session["username"] = username
        session["full_name"] = result["full_name"]
        session["role"] = result["role"]

        return jsonify({
            "redirect": url_for("dashboard")
        })

    return jsonify({
        "message": "Invalid username or password"
    }), 401




# -------------Register New Account--------------
@app.route('/register', methods=['GET'])
def register():
    return render_template('register.html')

@app.route("/register", methods=["POST"])
def register_user():
    """
    Registration Step 1: Validate user data and send OTP to email.
    """
    try:
        data = request.get_json()
        username = str(data.get("username")).strip()
        employee_id = str(data.get("employeeId")).strip()
        full_name = str(data.get("fullName")).strip()
        phone = str(data.get("phone")).strip()
        password = str(data.get("password")).strip()
        confirm_password = str(data.get("confirmPassword")).strip()
        role = str(data.get("role")).strip()
        email = str(data.get("email")).strip()
        

        # Password validation
        if len(password) < 8 or not any(c.isupper() for c in password) or not any(c.islower() for c in password) or not any(c.isdigit() for c in password) or not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return jsonify({
                "message": "Password must be at least 8 characters and contain minimum one uppercase, one lowercase, a number, and a special character"
            }), 400

        if password != confirm_password:
            return jsonify({
                "message": "Passwords do not match"
            }), 400
        
        # Validate all fields are present
        if not all([username, employee_id, full_name, phone, role, email]):
            return jsonify({
                "message": "All fields are required"
            }), 400
        
        # Check db is username / email / employee_id already exists
        result = db.register_user(
            username, full_name, employee_id, phone, role, password, email, mode="otp"
        )
        if result.get("user_id") is not None:
            return jsonify({
                "message": "Username, email, or employee ID already exists"
            }), 400
        

        # Store registration data temporarily in session for OTP verification
        session["pending_registration"] = {
            "username": username,
            "employee_id": employee_id,
            "full_name": full_name,
            "phone": phone,
            "password": password,
            "role": role,
            "email": email
        }
        
        # Send OTP to email
        success, message = otp.send_register_otp(username, email)
        if not success:
            return jsonify({"message": message}), 500

        return jsonify({
            "redirect": f"/verify-otp?username={username}&context=registration",
            "message": "OTP sent to your email"
        }), 200
        
    except Exception as e:
        return jsonify({"message": f"Registration error: {str(e)}"}), 500


@app.route("/verify-otp-registration", methods=["POST"])
def verify_otp_registration():
    """
    Registration Step 2: Verify OTP and complete registration.
    """
    data = request.get_json()
    username = str(data.get("username", "")).strip()
    otp_input = str(data.get("otp", "")).strip()

    # Verify OTP
    verified, message = otp.verify_otp(username, otp_input)
    if not verified:
        return jsonify({"message": message}), 400

    # Get pending registration data from session
    pending_reg = session.get("pending_registration")
    if not pending_reg or pending_reg.get("username") != username:
        return jsonify({"message": "Registration session expired. Please register again."}), 400

    # Complete the registration
    result = db.register_user(
        pending_reg["username"],
        pending_reg["full_name"],
        pending_reg["employee_id"],
        pending_reg["phone"],
        pending_reg["role"],
        pending_reg["password"],
        pending_reg["email"],
        mode = "registration"
    )

    if result.get("user_id") is not None:
        # Clear session data and OTP
        otp.clear_otp(username)
        session.pop("pending_registration", None)
        return jsonify({
            "message": "Registration successful!",
            "redirect": url_for("login_page")
        }), 200

    return jsonify({
        "message": "Registration failed. Please try again."
    }), 500


@app.route("/resend-otp-registration", methods=["POST"])
def resend_otp_registration():
    """
    Resend OTP during registration.
    """
    data = request.get_json()
    username = str(data.get("username", "")).strip()

    pending_reg = session.get("pending_registration")
    if not pending_reg or pending_reg.get("username") != username:
        return jsonify({"message": "Registration session expired."}), 400

    email = pending_reg.get("email")
    success, message = otp.send_register_otp(username, email)
    
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"message": message}), 500

# =============================================================================
# OTP Verification
# =============================================================================

@app.route('/verify-otp', methods=['GET'])
def verify_otp_page():
    """Show OTP verification page."""
    return render_template('verify-otp.html')


# =============================================================================
# Reset Password — 3-step flow:
#   Step 1: GET  /reset              → show the reset page
#   Step 2: POST /reset/send-otp     → look up user email, send OTP
#   Step 3: POST /reset/verify-otp   → verify the 6-digit OTP
#   Step 4: POST /reset              → do the actual password reset (OTP-gated)
# =============================================================================

@app.route('/reset', methods=['GET'])
def reset():
    return render_template('reset.html')


@app.route("/reset/send-otp", methods=["POST"])
def reset_send_otp():
    """
    Expects JSON: { "username": "john_doe" }
    Looks up the user's registered email from DB, then sends OTP.
    """
    data = request.get_json()
    username = str(data.get("username", "")).strip()

    if not username or len(username) < 3:
        return jsonify({"message": "Please enter a valid username."}), 400

    # Look up the user's email from DB
    # db.get_user_email() should return the email string or None if not found
    result = db.get_user_email(username)
    user_email = str(result.get("user_email"))
    if not user_email:
        # Intentionally vague — don't reveal whether username exists
        return jsonify({"message": "If this username exists, an OTP will be sent to the registered email."}), 200

    success, message = otp.send_otp(username, user_email)
    if not success:
        return jsonify({"message": message}), 500

    return jsonify({"message": message}), 200


@app.route("/reset/verify-otp", methods=["POST"])
def reset_verify_otp():
    """
    Expects JSON: { "username": "john_doe", "otp": "123456" }
    """
    data = request.get_json()
    username = str(data.get("username", "")).strip()
    otp_input = str(data.get("otp", "")).strip()

    if not username or not otp_input:
        return jsonify({"message": "Username and OTP are required."}), 400

    verified, message = otp.verify_otp(username, otp_input)
    if not verified:
        return jsonify({"message": message}), 400

    return jsonify({"message": message}), 200


@app.route("/reset", methods=["POST"])
def reset_password():
    """
    Final step — only runs if OTP has been verified in this session.
    Expects JSON: { "username": "...", "new_password": "...", "confirm_password": "..." }
    """
    data = request.get_json()
    username = str(data.get("username", "")).strip()
    new_password = str(data.get("new_password", "")).strip()
    confirm_password = str(data.get("confirm_password", "")).strip()

    if not username or not new_password or not confirm_password:
        return jsonify({"message": "All fields are required."}), 400

    if new_password != confirm_password:
        return jsonify({"message": "Passwords do not match."}), 400

    # Gate: OTP must have been verified in this session
    if not otp.is_otp_verified(username):
        return jsonify({"message": "OTP verification required before resetting password."}), 403

    reset_success, status_msg = db.reset_password(username, new_password, confirm_password)

    if reset_success:
        otp.clear_otp(username)   # clean up session OTP data after successful reset
        return jsonify({"message": status_msg or "Password reset successfully."}), 200
    else:
        return jsonify({"message": status_msg or "Failed to reset password."}), 500


# -------------Dashboard--------------
@app.route('/dashboard', methods=['GET'])
def dashboard():
    if not session.get("login"):
        return redirect(url_for("login_page"))
    
    return render_template('dashboard.html')

@app.route('/dashboard-data')
def get_dashboard_data():
    data = db.get_dashboard_stats()
    return jsonify(data)



# -------------batch assign--------------
@app.route('/batch', methods=['GET'])
def batch():
    if not session.get("login"):
        return redirect(url_for("login_page"))
    return render_template('batch.html')



@app.route('/batch/assign', methods=['POST'])
def assign_batch():
    if not session.get("login"):
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}

    product_name    = data.get("brand", "").strip()
    product_code     = int(data.get("code", "").strip())
    lots     = data.get("lots", [])
    password = data.get("password", "").strip()

    created_by = session.get("username", "unknown_user")

    # ── Validate top-level fields ──────────────────────────────
    if not all([product_name, product_code, password, created_by]):
        return jsonify({"message": "All fields are required"}), 400

    if not isinstance(lots, list) or len(lots) == 0:
        return jsonify({"message": "At least one lot must be provided"}), 400

    # ── Verify password ────────────────────────────────────────
    user = db.login(created_by, password)
    if user["status_code"] != 1:
        return jsonify({"message": "Incorrect password"}), 40

    # ── Validate and normalise each lot row ────────────────────
    normalised_lots = []
    for i, lot in enumerate(lots, start=1):
        lot_number = str(lot.get("lotNumber", "")).strip().upper()

        if not lot_number:
            return jsonify({"message": f"Row {i}: lot number is missing"}), 400

        normalised_lots.append(lot_number)
    
    o_status_code = -1
    o_status_msg = None
    # ── Call DB / business logic for each lot ─────────────────
    try:
        for lot_number in normalised_lots:
          o_status_code, o_status_msg = db.assign_batch(
              lot_number, product_code, product_name, created_by
          )
          if int(o_status_code) != 1:
              return jsonify({"message": o_status_msg or "Assignment failed"}), 400
          time.sleep(1)
    except Exception as e:
        o_status_code = 0
        o_status_msg = str(e)
        return jsonify({
            "status_code": int(o_status_code) if o_status_code is not None else 0,
            "message":     o_status_msg or "Lot assignment failed",
        }), 400

    if int(o_status_code) == 1:
        return jsonify({
            "status_code": 1,
            "message":     o_status_msg,
            "summary": {
                "product_code":  product_code,
                "brand":         product_name,
                "lots_assigned": len(normalised_lots),
            }
        }), 200

    return jsonify({
        "status_code": int(o_status_code) if o_status_code is not None else 0,
        "message":     o_status_msg or "Lot assignment failed",
    }), 400


@app.route('/get/lot', methods=['POST'])
def get_lot():
    if not session.get("login"):
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    lot_number = data.get("lotNumber", "").strip()

    if not lot_number:
        return jsonify({"message": "Lot number is required"}), 400

    result = db.get_lot_code_count(lot_number)
    print(f"Debug: get_lot_code_count('{lot_number}') returned: {result}")  # Debug log
    
    if result is None:
        return jsonify({"message": f"Lot '{lot_number}' not found"}), 404

    return jsonify({
        "lot_number":      result["lot_number"],
        "available_codes": int(result["available_codes"]),
    }), 200




# -------------code generation--------------
@app.route('/generate', methods=['GET'])
def code():
    return render_template('code.html')

@app.route('/generate/code', methods=['POST'])
def generate_code():
    if not session.get("login"):
        return jsonify({
            "message": "Unauthorized",
            "redirect": url_for("login_page")
        }), 401
    username = session.get("username", "unknown_user")
    data = request.get_json()
    quantity = data.get("count")
    if not quantity or quantity <= 0:
        return jsonify({
            "message": "Invalid code count",
            "redirect": url_for("code")
        }), 400
    status_code, status_msg = db.generate_codes(quantity, username)

    if status_code == 1:
        # Assuming the new codes are not assigned to a lot yet, so we pass None.
        # This might need adjustment depending on how new codes are identified.
        new_codes = db.get_scratch_codes(None) 
        return jsonify({
            "message": f"Generated codes with status: {status_msg}",
            "status_code": status_code,
            "new_codes": new_codes
        }), 200
    
    return jsonify({
        "message": f"Generated codes with status: {status_msg}",
        "status_code": status_code
    }), 200

@app.route('/generate/export', methods=['POST'])
def export_security_codes():
    if not session.get("login"):
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    lot_number = data.get("lotNumber")
    file_format = data.get("fileFormat")

    if not lot_number or not file_format:
        return jsonify({"message": "Lot number and file format are required"}), 400

    codes = db.get_scratch_codes(lot_number)

    if not codes:
        return jsonify({"message": "No codes found for the given lot number"}), 404

    df = pd.DataFrame(codes)
    output = BytesIO()

    if file_format == 'excel':
        df.to_excel(output, index=False)
        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = f"{lot_number}_Scratch_Codes.xlsx"
    elif file_format == 'csv':
        df.to_csv(output, index=False)
        mimetype = 'text/csv'
        filename = f"{lot_number}_Scratch_Codes.csv"
    else:
        return jsonify({"message": "Unsupported file format"}), 400

    output.seek(0)

    return send_file(
        output,
        mimetype=mimetype,
        as_attachment=True,
        download_name=filename
    )

@app.route('/generate/summary', methods=['GET'])
def generate_summary():
    if not session.get("login"):
        return jsonify({"message": "Unauthorized"}), 401
    
    summary = db.get_code_summary()

    if summary is None:
        return jsonify({"message": "Could not retrieve code summary"}), 500

    return jsonify(summary), 200

# -------------Logout--------------
@app.route("/logout")
def logout():
    session.clear()
    return jsonify({
            "redirect": url_for("login_page")
        })


if __name__ == '__main__':
    app.run(debug=True, port=5000)