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

if __name__ == '__main__':
    app.run(debug=True, port=5500)