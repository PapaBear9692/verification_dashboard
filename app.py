from flask import Flask, jsonify, render_template

app = Flask(__name__)

@app.route('/', methods=['GET'])
def welcome():
    return render_template('welcome.html')

@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html')

@app.route('/register', methods=['GET'])
def register():
    return render_template('register.html')

@app.route('/reset', methods=['GET'])
def reset():
    return render_template('reset.html')

@app.route('/dashboard', methods=['GET'])
def dashboard():
    return render_template('dashboard.html')

@app.route('/batch', methods=['GET'])
def batch():
    return render_template('batch.html')

@app.route('/code', methods=['GET'])
def code():
    return render_template('code.html')
 
 
if __name__ == '__main__':
    app.run(debug=True, port=5500)