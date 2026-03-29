# verification_dashboard
Admin Panel and control center of verification portal


# Deployment Documentation: Verification Dashboard

## Environment Overview
* **Domain:** `verify.squarepharma.com.bd`
* **Subdirectory:** `/admin`
* **Application:** Python Flask (`verification_dashboard`)
* **WSGI Server:** Gunicorn (Running on Port `8081` with 3 workers)
* **Reverse Proxy:** Nginx
* **Linux User:** `erpsoft`
* **Project Path:** `/home/erpsoft/verification_dashboard`
* **Virtual Env:** `/home/erpsoft/verification_dashboard/vdashboard`

---

## 1. Oracle Instant Client Installation (Linux)

The application requires the Oracle Instant Client to connect to the Oracle database. Here is a step-by-step guide to installing version 19.30 on a 64-bit Linux system.

### Step 1: Download the Packages
You will need to download the ZIP files directly from the [Oracle Instant Client Downloads page](https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html). An Oracle account is required.

Download these two files (version 19.30):
1.  **Basic Package** (Required): `instantclient-basic-linux.x64-19.30.0.0.0dbru.zip`
2.  **SQL*Plus Package** (Recommended for testing): `instantclient-sqlplus-linux.x64-19.30.0.0.0dbru.zip`

### Step 2: Install the Required Dependency (`libaio`)
The Oracle Instant Client requires the `libaio` library.

**For Ubuntu / Debian:**
```bash
sudo apt-get update
sudo apt-get install libaio1
```

**For CentOS / RHEL / Fedora:**
```bash
sudo yum install libaio
```

### Step 3: Extract the ZIP Files
The recommended directory for the client is `/opt`.

1.  Create the target directory:
    ```bash
    sudo mkdir -p /opt/oracle
    ```
2.  Unzip the downloaded files into that directory:
    ```bash
    # Assuming the files are in your Downloads folder
    cd ~/Downloads
    sudo unzip instantclient-basic-linux.x64-19.30.0.0.0dbru.zip -d /opt/oracle
    sudo unzip instantclient-sqlplus-linux.x64-19.30.0.0.0dbru.zip -d /opt/oracle
    ```
    Both files will extract into the `/opt/oracle/instantclient_19.30` directory.

### Step 4: Configure the Dynamic Linker
To inform the system where the Oracle libraries are located, configure `ldconfig`.

1.  Create a configuration file for the Oracle libraries:
    ```bash
    sudo sh -c "echo /opt/oracle/instantclient_19.30 > /etc/ld.so.conf.d/oracle-instantclient.conf"
    ```
2.  Update the dynamic linker cache:
    ```bash
    sudo ldconfig
    ```

### Step 5: Update Your PATH
To use tools like `sqlplus`, add the Instant Client to your system's `PATH`.

1.  Open your profile script (e.g., `~/.bashrc`):
    ```bash
    nano ~/.bashrc
    ```
2.  Add this line to the end of the file:
    ```bash
    export PATH=/opt/oracle/instantclient_19.30:$PATH
    ```
3.  Reload your profile:
    ```bash
    source ~/.bashrc
    ```

### Step 6: Verify the Installation
Confirm that the installation was successful:
```bash
sqlplus -V
```
You should see output similar to: `SQL*Plus: Release 19.30.0.0.0 - Production`.

---

## 2. Initial Setup
First, clone the repository, set up the Python virtual environment, and install the necessary dependencies.

```bash
# Navigate to the parent directory where you want to clone the project
cd /home/erpsoft

# Clone the repository
git clone <your-repository-url>

# Navigate into the project directory
cd verification_dashboard

# Create a Python virtual environment
python3 -m venv vdashboard

# Activate the virtual environment
source vdashboard/bin/activate

# Install the required packages
pip install -r requirements.txt
```

---

## 3. Systemd Service Setup (Gunicorn)
To ensure the app runs continuously and automatically pulls the latest code on restart, a systemd service was created.

**File:** `nano /etc/systemd/system/verification_dashboard.service`

[Unit]
Description=Gunicorn instance to serve verification_dashboard
After=network.target

[Service]
User=erpsoft
Group=erpsoft
WorkingDirectory=/home/erpsoft/verification_dashboard
Environment="PATH=/home/erpsoft/verification_dashboard/vdashboard/bin"

# Pulls the latest code before each start
ExecStartPre=/usr/bin/git pull origin main

# Starts Gunicorn on port 8081
ExecStart=/home/erpsoft/verification_dashboard/vdashboard/bin/gunicorn --workers 3 --bind 127.0.0.1:8081 app:app

[Install]
WantedBy=multi-user.target


**Commands Used to Activate:**
```bash
sudo systemctl daemon-reload
sudo systemctl start verification_dashboard.service
sudo systemctl enable verification_dashboard.service
```

## 4. Nginx Reverse Proxy Configuration
To route internet traffic from `verify.squarepharma.com.bd/admin` to the local Gunicorn instance on port `8081`, specific location blocks were added to the existing Nginx HTTPS server block.

**Added Configuration:**
```nginx
    # Redirect exact /admin requests to /admin/
    location = /admin {
        return 301 /admin/;
    }

    # Serve static files directly via Nginx
    location /admin/static/ {
        alias /home/erpsoft/verification_dashboard/static/;
        autoindex off;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
        access_log off;
    }

    # Proxy all other /admin/ requests to Gunicorn
    location /admin/ {
        proxy_pass http://127.0.0.1:8081/; 
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Critical: Tells Flask to prepend /admin to all generated URLs
        proxy_set_header X-Forwarded-Prefix /admin; 
        proxy_buffering off;
    }
```

## 5. Flask Application Fix (`app.py`) ##if now included
Because Nginx strips the `/admin/` prefix before handing the request to Gunicorn, Flask needed to be informed that it was operating behind a proxy so it could generate URLs (like redirects) correctly.

**Added to `app.py`:**
```python
from werkzeug.middleware.proxy_fix import ProxyFix

# Initialization
app = Flask(__name__, static_url_path="/admin/static")

# Trust proxy headers (specifically X-Forwarded-Prefix) so that /admin is recognized
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
```
```
