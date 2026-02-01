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

    authenticated_id = db.authenticate(username, password)
    time.sleep(3)  # Simulate processing delay
    if authenticated_id:
        session["login"] = True
        session["user_id"] = authenticated_id
        session["username"] = username

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
    username = data.get("username")
    employee_id = data.get("employeeId")
    full_name = data.get("fullName")
    phone = data.get("phone")
    password = data.get("password")
    confirm_password = data.get("confirmPassword")
    role = data.get("role")

    if password != confirm_password:
        return jsonify({
            "message": "Passwords do not match"
        }), 400
    
    if db.user_exists(employee_id):
        return jsonify({
            "message": "User already exists"
        }), 409
    
    user_id = db.create_user(username, full_name, employee_id, phone, role, password)
    time.sleep(3)  # Simulate processing delay
    if user_id:
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
    username = data.get("username")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if new_password != confirm_password:
        return jsonify({
            "message": "Passwords do not match"
        }), 400

    time.sleep(3)  # Simulate processing delay
    if not db.user_exists(username):
        return jsonify({
            "message": "User does not exist"
        }), 404
    
    reset_success = db.reset_password(username, new_password)
    if reset_success:
        return jsonify({
            "redirect": url_for("login_page")
        })
    else:
        return jsonify({
            "message": "Failed to reset password"
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
    return render_template('batch.html')

# -------------code generation--------------
@app.route('/code', methods=['GET'])
def code():
    return render_template('code.html')

# -------------Logout--------------
@app.route("/logout")
def logout():
    session.clear()
    return jsonify({
            "redirect": url_for("login_page")
        })


if __name__ == '__main__':
    app.run(debug=True, port=5500)