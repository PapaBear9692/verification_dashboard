document.addEventListener('DOMContentLoaded', function() {
  const otpInput = document.getElementById('otpInput');
  const verifyBtn = document.getElementById('verifyBtn');
  const verifyForm = document.getElementById('verifyOtpForm');
  const resendBtn = document.getElementById('resendBtn');
  const backLink = document.getElementById('backLink');
  const notificationToast = new bootstrap.Toast(document.getElementById('notificationToast'));
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  
  // Get username and context from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('username');
  const context = urlParams.get('context'); // 'registration' or 'reset'

  // Set hidden input values
  document.getElementById('username').value = username;
  document.getElementById('context').value = context;

  // Set back link based on context
  if (context === 'registration') {
    backLink.href = '/register';
    backLink.textContent = 'Back to Registration';
  } else if (context === 'reset') {
    backLink.href = '/reset';
    backLink.textContent = 'Back to Password Reset';
  }

  // Enable/disable verify button based on OTP input
  otpInput.addEventListener('input', function() {
    if (this.value.length === 6 && /^\d{6}$/.test(this.value)) {
      verifyBtn.disabled = false;
    } else {
      verifyBtn.disabled = true;
    }
  });

  // Handle OTP verification
  verifyForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const otp = otpInput.value.trim();
    
    if (!otp || otp.length !== 6) {
      showNotification('Invalid Input', 'Please enter a valid 6-digit code', 'error');
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.classList.add('is-loading');

    try {
      let endpoint, payload;

      if (context === 'registration') {
        // For registration, verify OTP
        endpoint = '/verify-otp-registration';
        payload = {
          username: username,
          otp: otp
        };
      } else if (context === 'reset') {
        // For password reset, verify OTP
        endpoint = '/reset/verify-otp';
        payload = {
          username: username,
          otp: otp
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('Success', 'OTP verified successfully!', 'success');
        
        // Redirect based on context
        setTimeout(() => {
          if (context === 'registration') {
            window.location.href = '/login?verified=true&username=' + encodeURIComponent(username);
          } else if (context === 'reset') {
            window.location.href = '/reset?step=3&username=' + encodeURIComponent(username);
          }
        }, 1500);
      } else {
        showNotification('Verification Failed', data.message || 'Invalid or expired OTP', 'error');
        otpInput.classList.add('is-invalid');
        verifyBtn.disabled = false;
        verifyBtn.classList.remove('is-loading');
      }
    } catch (error) {
      showNotification('Error', 'An error occurred. Please try again.', 'error');
      verifyBtn.disabled = false;
      verifyBtn.classList.remove('is-loading');
    }
  });

  // Handle resend OTP
  resendBtn.addEventListener('click', async function() {
    resendBtn.disabled = true;
    
    try {
      let endpoint, payload;

      if (context === 'registration') {
        endpoint = '/resend-otp-registration';
        payload = { username: username };
      } else if (context === 'reset') {
        endpoint = '/reset/send-otp';
        payload = { username: username };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('OTP Sent', 'A new OTP has been sent to your email', 'success');
        startResendCountdown();
        otpInput.value = '';
        otpInput.classList.remove('is-invalid');
        verifyBtn.disabled = true;
      } else {
        showNotification('Error', data.message || 'Failed to resend OTP', 'error');
        resendBtn.disabled = false;
      }
    } catch (error) {
      showNotification('Error', 'An error occurred. Please try again.', 'error');
      resendBtn.disabled = false;
    }
  });

  // Countdown timer for resend
  function startResendCountdown() {
    let countdown = 60;
    document.getElementById('resendCounter').classList.remove('d-none');
    document.getElementById('resendText').textContent = 'Resending...';

    const interval = setInterval(() => {
      countdown--;
      document.getElementById('countdown').textContent = countdown;

      if (countdown === 0) {
        clearInterval(interval);
        document.getElementById('resendCounter').classList.add('d-none');
        document.getElementById('resendText').textContent = 'Resend OTP';
        resendBtn.disabled = false;
      }
    }, 1000);
  }

  // Show toast notification
  function showNotification(title, message, type = 'info') {
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    const toastElement = document.getElementById('notificationToast');
    toastElement.className = 'toast';
    
    if (type === 'success') {
      toastElement.classList.add('text-success');
    } else if (type === 'error') {
      toastElement.classList.add('text-danger');
    }
    
    notificationToast.show();
  }

  // Clear invalid state on input
  otpInput.addEventListener('input', function() {
    this.classList.remove('is-invalid');
    document.getElementById('otpError').textContent = '';
  });
});
