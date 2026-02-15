import time
from flask import Flask, jsonify, redirect, render_template, request, url_for, url_for, session
from models.dbModel import ProductDB


app = Flask(__name__)
app.secret_key = "(this@is#a.super?secret129875Key}that%no@one97+shoudl&know/for?now.1563@!"
db = ProductDB()


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
    data = request.get_json()
    username = str(data.get("username")).strip()
    employee_id = str(data.get("employeeId")).strip()
    full_name = str(data.get("fullName")).strip()
    phone = str(data.get("phone")).strip()
    password = str(data.get("password")).strip()
    confirm_password = str(data.get("confirmPassword")).strip()
    role = str(data.get("role")).strip()
    email = str(data.get("email")).strip()

    print(f"Received registration data: {data}")  # Debug log

    if password != confirm_password:
        return jsonify({
            "message": "Passwords do not match"
        }), 400
    
    result = db.register_user(username, full_name, employee_id, phone, role, password, email)
    
    if  result.get("user_id") is not None:
        return jsonify({
            "redirect": url_for("login_page")
        })

    return jsonify({
        "message": "Registration failed. Please try again."
    }), 500

# -------------Reset Password--------------
@app.route('/reset', methods=['GET'])
def reset():
    return render_template('reset.html')

@app.route("/reset", methods=["POST"])
def reset_password():
    data = request.get_json()
    username = str(data.get("username")).strip()
    new_password = str(data.get("new_password")).strip()
    confirm_password = str(data.get("confirm_password")).strip()
    
    if new_password != confirm_password:
        print(f"Password mismatch: new_password='{new_password}' confirm_password='{confirm_password}'")  # Debug log
        return jsonify({
            "message": "Passwords do not match"
        }), 400
    print(f"Attempting password reset for username: {username}")  # Debug log
    
    reset_success, status_msg = db.reset_password(username, new_password, confirm_password)
    if reset_success:
        return jsonify({
            "message": status_msg
        })
    else:
        return jsonify({
            "message": status_msg or "Failed to reset password"
        }), 500

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



@app.route('/batch', methods=['POST'])
def assign_batch():
    if not session.get("login"):
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}

    p_prod_id = data.get("P_PROD_ID")
    p_generic = data.get("P_GENERIC")
    p_prod_name = data.get("P_PROD_NAME")
    p_batch = data.get("P_BATCH")
    p_mnf_date = data.get("P_MNF_DATE")   # "YYYY-MM-DD"
    p_exp_date = data.get("P_EXP_DATE")   # "YYYY-MM-DD"
    p_batch_size = data.get("P_BATCH_SIZE")
    p_uom = data.get("P_UOM")

    # Validate required fields
    if not all([p_prod_id, p_generic, p_prod_name, p_batch, p_mnf_date, p_exp_date, p_batch_size, p_uom]):
        return jsonify({"message": "All fields are required"}), 400

    # Optional: normalize numbers (safely)
    try:
        p_prod_id = int(p_prod_id) # type: ignore
        p_batch_size = int(p_batch_size) # type: ignore
    except (TypeError, ValueError):
        return jsonify({"message": "PRODUCT_ID and BATCH_SIZE must be numbers"}), 400

    o_status_code, o_status_msg = db.assign_batch(p_prod_id, p_generic, p_prod_name, p_batch, p_mnf_date, p_exp_date, p_batch_size, p_uom)

    # DB contract: 1 == success, 0 == failed
    if int(o_status_code) == 1:
        return jsonify({
            "status_code": int(o_status_code),
            "message": o_status_msg or f"Batch {p_batch} created successfully"
        }), 200

    return jsonify({
        "status_code": int(o_status_code) if o_status_code is not None else 0,
        "message": o_status_msg or "Batch creation failed"
    }), 400



@app.route('/batch/export', methods=['POST'])
def export_batch():
    if not session.get("login"):
        return jsonify({
            "message": "Unauthorized"
        }), 401

    data = request.get_json()
    batchNumber= data.get("batchNumber")
    exportType= data.get("exportType")
    exportFormat= data.get("exportFormat")
    timezone= data.get("timezone")
    if not all([batchNumber, exportType, exportFormat, timezone]):
        return jsonify({
            "message": "All fields are required"
        }), 400
    
    if exportType == "summary":
        filename = db.export_batch_summary(batchNumber)
    elif exportType == "codes":
        filename = db.export_batch_codes(batchNumber)
    else:  # both
        filename = db.export_batch_full(batchNumber)

    return jsonify({
        "filename": filename
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

    data = request.get_json()
    quantity = data.get("count")
    if not quantity or quantity <= 0:
        return jsonify({
            "message": "Invalid code count"
        }), 400
    time.sleep(2)  # Simulate processing delay
    success_count = db.generate_codes(quantity)
    return jsonify({
        "message": f"Generated {success_count} codes"
    }), 200

# -------------Logout--------------
@app.route("/logout")
def logout():
    session.clear()
    return jsonify({
            "redirect": url_for("login_page")
        })


if __name__ == '__main__':
    app.run(debug=True, port=5000)