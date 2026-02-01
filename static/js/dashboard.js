/* =========================================
   Dashboard Data Loading Logic
   ========================================= */

document.addEventListener("DOMContentLoaded", function() {
    initDashboard();
});

function initDashboard() {
    getTimeZone(); // Load timezone
    fetchDashboardData(); // Load data from Python
}

function fetchDashboardData() {
    // 1. Fetch data from Python Flask Endpoint
    fetch('/dashboard-data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // 2. Send data to the UI update function
            updateDashboardUI(data);
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
            document.getElementById('user-name-display').innerText = "Error loading data";
        });
}

function updateDashboardUI(data) {
    // --- A. Fill Simple Text Fields ---
    setText('user-name-display', data.user_name);
    
    // Operational Health
    setText('stat-system-health', data.system_health);
    if(data.system_health === 'Healthy') {
        document.getElementById('stat-system-health').className = 'report-value text-success';
    } else {
        document.getElementById('stat-system-health').className = 'report-value text-danger';
    }

    setText('stat-verifications-today', data.verifications_today);
    setText('stat-suspicious-ratio', data.suspicious_ratio);
    setText('stat-peak-hour', data.peak_hour);

    // Trends
    setText('trend-today', data.trend_today);
    setText('trend-week', data.trend_week);
    setText('trend-month', data.trend_month);

    // Breakdown
    setText('breakdown-genuine', data.genuine_count);
    setText('breakdown-invalid', data.invalid_count);
    setText('breakdown-repeated', data.repeated_count);
    setText('breakdown-total', data.total_generated);

    // Suspicious Snapshot
    setText('stat-repeated-attempts', data.repeated_attempts);
    setText('stat-ip-spamming', data.ip_spamming);
    setText('stat-high-risk', data.high_risk_events);

    // --- B. Fill "Hot Products" List (Loop) ---
    const hotProductsContainer = document.getElementById('hot-products-container');
    // Preserve the header, clear the rest
    const hotHeader = hotProductsContainer.querySelector('.hot-header');
    hotProductsContainer.innerHTML = ''; 
    hotProductsContainer.appendChild(hotHeader); 

    data.hot_products.forEach(product => {
        const row = document.createElement('div');
        row.className = 'hot-row';
        row.innerHTML = `
            <span>${product.name}</span>
            <span>${product.batch}</span>
            <span class="hot-value">${product.scans}</span>
        `;
        hotProductsContainer.appendChild(row);
    });

    // --- C. Fill "Recent Verifications" List (Loop) ---
    const verifContainer = document.getElementById('list-recent-verifications');
    verifContainer.innerHTML = ''; // Clear "Loading..." text

    data.recent_verifications.forEach(item => {
        const row = document.createElement('div');
        row.className = 'event-row';
        row.innerHTML = `
            <span class="event-time">${item.time}</span>
            <span class="event-text">
                Code <strong>${item.code}</strong> ${item.description}
            </span>
            <span class="event-status ${item.status_class}">${item.status}</span>
        `;
        verifContainer.appendChild(row);
    });

    // --- D. Fill "Admin Actions" List (Loop) ---
    const adminContainer = document.getElementById('list-admin-actions');
    adminContainer.innerHTML = ''; 

    data.admin_actions.forEach(action => {
        const row = document.createElement('div');
        row.className = 'event-row';
        row.innerHTML = `
            <span class="event-time">${action.time}</span>
            <span class="event-text">${action.text}</span>
            <span class="event-status ${action.status_class}">${action.status}</span>
        `;
        adminContainer.appendChild(row);
    });
}

// Helper: Safely set text content
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

/* =========================================
   Utilities (Timezone, Scroll)
   ========================================= */
function getTimeZone() {
    console.log("Timezone loaded");
}

async function logoutUser() {
    const response = await fetch("/logout", {
        method: "GET", 
        headers: {
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();
    if (response.ok) {
        window.location.href = data.redirect;
    } else {
        alert("Logout failed. Please try again.");
    }
}

// Scroll Button Logic
window.onscroll = function() { scrollFunction() };
function scrollFunction() {
    const btn = document.getElementById("backToTopBtn");
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        btn.style.display = "block";
    } else {
        btn.style.display = "none";
    }
}
function scrollToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}