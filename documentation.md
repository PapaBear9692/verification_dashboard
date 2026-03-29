# Verification Dashboard Documentation

## 1. Introduction

The Verification Dashboard is a comprehensive web application built with Flask that serves as an admin panel and control center for a product verification system. It provides functionalities for user management, product batch assignment, security code generation, and monitoring of verification activities through a detailed dashboard.

This document provides a complete guide to understanding, installing, and using the Verification Dashboard application.

## 2. Features

The application includes the following key features:

*   **User Authentication:** Secure user registration with email OTP verification, login, and password reset functionality.
*   **Dashboard:** An interactive dashboard that provides real-time statistics on system health, verification trends, and suspicious activities.
*   **Batch Assignment:** Allows administrators to assign lot numbers to products.
*   **Security Code Generation:** Functionality to generate a specified quantity of unique security codes for product verification.
*   **Code Management:**
    *   **Export:** Export generated security codes in Excel or CSV formats.
    *   **Search:** Search for specific codes or view details of a batch.
*   **User Roles:** The system supports different user roles, which can be used to control access to various features.
*   **Email Notifications:** Sends OTPs and other notifications to users via email.

## 3. Technology Stack

The project is built using the following technologies:

*   **Backend:**
    *   **Framework:** Flask
    *   **Database:** Oracle Database
    *   **OTP & Caching:** Redis
    *   **WSGI Server:** Gunicorn
*   **Frontend:**
    *   **HTML, CSS, JavaScript**
    *   **Bootstrap 5**
*   **Deployment:**
    *   **Reverse Proxy:** Nginx
    *   **OS:** Linux (deployment environment)

## 4. Prerequisites

Before you begin, ensure you have the following installed:

*   Python 3.10
*   Oracle Instant Client 19.30
*   Redis Server
*   An Oracle Database instance

## 5. Installation and Setup

Follow these steps to set up the project locally:

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd verification_dashboard
    ```

2.  **Create a Python virtual environment:**
    ```bash
    python3 -m venv vdashboard
    source vdashboard/bin/activate  
    # On Windows, use 'conda create -n vdashboard python=3.10' and 'conda activate vdashboard'
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure environment variables:**
    Create a `.env` file in the root directory and add the following variables:

    ```env
    APP.SECRET=your_flask_app_secret_key
    
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_DSN=your_db_dsn
    
    MAIL_SERVER=your_mail_server
    MAIL_PORT=your_mail_port
    MAIL_USE_TLS=True
    MAIL_USERNAME=your_mail_username
    MAIL_PASSWORD=your_mail_password
    MAIL_DEFAULT_SENDER=your_default_sender_email
    ```

5.  **Run the application:**
    ```bash
    python app.py
    ```
    The application will be available at `http://127.0.0.1:8081`.

## 6. Database Setup

The application relies on an Oracle Database with a specific schema and stored procedures. The `models/dbModel.py` file interacts with the database.

**Key Stored Procedures:**

*   `verify_user_login_prc`: For user authentication.
*   `verify_user_reg_prc`: For user registration.
*   `verify_user_get_email_prc`: To get a user's email.
*   `verify_user_forgot_pwd_prc`: For resetting user passwords.
*   `INSERT_PRODUCT_AUTH_MASTER`: To assign a batch to a product.
*   `get_lot_size`: To get the number of codes in a lot.
*   `GEN_SCRATCH_CODE_TEST`: To generate scratch codes.
*   `get_scratch_codes`: To retrieve scratch codes for a lot.

Ensure these stored procedures are created in your Oracle Database.

## 7. Application Structure

The project follows a standard Flask application structure:

```
.
├── app.py              # Main Flask application file
├── requirements.txt    # Python dependencies
├── .env                # Environment variables (create this file)
├── models/
│   ├── dbModel.py      # Database interaction logic
│   └── otpModel.py     # OTP generation and verification logic
├── static/
│   ├── css/
│   ├── js/
│   └── images/
└── templates/
    ├── login.html
    ├── dashboard.html
    └── ...             # Other HTML templates
```

## 8. API Endpoints

The application exposes several API endpoints for various functionalities. Below is a detailed breakdown of each endpoint.

### 8.1. Web Pages

| Method | Endpoint      | Function          | Description                               |
|--------|---------------|-------------------|-------------------------------------------|
| GET    | `/`           | `welcome()`       | Renders the landing page.                 |
| GET    | `/login`      | `login_page()`    | Renders the login page.                   |
| GET    | `/register`   | `register()`      | Renders the user registration page.       |
| GET    | `/verify-otp` | `verify_otp_page()` | Renders the OTP verification page.        |
| GET    | `/reset`      | `reset()`         | Renders the password reset page.          |
| GET    | `/dashboard`  | `dashboard()`     | Renders the main dashboard (requires login). |
| GET    | `/batch`      | `batch()`         | Renders the batch assignment page (requires login). |
| GET    | `/generate`   | `code()`          | Renders the code generation page (requires login). |

### 8.2. Authentication

| Method | Endpoint                      | Function                      | Description                                           |
|--------|-------------------------------|-------------------------------|-------------------------------------------------------|
| POST   | `/login`                      | `login()`                     | Handles user login.                                   |
| POST   | `/register`                   | `register_user()`             | Step 1 of registration: Validates user data and sends OTP. |
| POST   | `/verify-otp-registration`    | `verify_otp_registration()`   | Step 2 of registration: Verifies OTP and creates the user. |
| POST   | `/resend-otp-registration`    | `resend_otp_registration()`   | Resends the OTP for registration.                     |
| POST   | `/reset/send-otp`             | `reset_send_otp()`            | Sends a password reset OTP to the user's email.       |
| POST   | `/reset/verify-otp`           | `reset_verify_otp()`          | Verifies the password reset OTP.                      |
| POST   | `/reset`                      | `reset_password()`            | Resets the user's password after OTP verification.    |
| GET    | `/logout`                     | `logout()`                    | Logs the user out and clears the session.             |

### 8.3. Dashboard

| Method | Endpoint           | Function              | Description                               |
|--------|--------------------|-----------------------|-------------------------------------------|
| GET    | `/dashboard-data`  | `get_dashboard_data()`| Fetches and returns statistics for the dashboard. |

### 8.4. Batch Management

| Method | Endpoint         | Function         | Description                               |
|--------|------------------|------------------|-------------------------------------------|
| POST   | `/batch/assign`  | `assign_batch()` | Assigns products and lots to a new batch.   |
| POST   | `/batch/getlot`  | `get_lot()`      | Retrieves details for a specific lot number. |

### 8.5. Code Generation & Management

| Method | Endpoint            | Function                   | Description                                         |
|--------|---------------------|----------------------------|-----------------------------------------------------|
| POST   | `/generate/code`    | `generate_code()`          | Generates a specified quantity of security codes.   |
| POST   | `/generate/export`  | `export_security_codes()`  | Exports security codes for a given lot number.      |
| POST   | `/generate/search`  | `search_codes_route()`     | Searches for codes by batch or scratch code.        |
| GET    | `/generate/summary` | `generate_summary()`       | Retrieves a summary of generated and available codes. |


## 9. Deployment

The application is designed to be deployed using Gunicorn as the WSGI server and Nginx as a reverse proxy. For detailed deployment instructions, refer to the `README.md` file.
