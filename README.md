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

## 1. Initial Setup
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

## 2. Systemd Service Setup (Gunicorn)
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

## 3. Nginx Reverse Proxy Configuration
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

## 4. Flask Application Fix (`app.py`)
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
