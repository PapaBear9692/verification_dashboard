// static/js/verify-otp.js

document.addEventListener('DOMContentLoaded', function() {
  // ===== Configuration =====
  const CONFIG = {
    otp: {
      length: 6,
      regex: /^\d{6}$/
    },
    timer: {
      resend: 120, // 2 minutes in seconds
      redirectDelay: 1500
    },
    endpoints: {
      registration: { verify: 'verify-otp-registration', resend: 'resend-otp-registration' },
      reset: { verify: 'reset/verify-otp', resend: 'reset/send-otp' }
    }
  };

  const UI_TEXT = {
    resend: { default: 'Resend OTP', sending: 'Resending...' },
    verify: { default: 'Verify OTP', loading: 'Verifying...' },
    notifications: {
      invalidInput: { title: 'Invalid Input', message: 'Please enter a valid 6-digit code' },
      verifySuccess: { title: 'Success', message: 'OTP verified successfully!' },
      verifyFailed: { title: 'Verification Failed', message: 'Invalid or expired OTP' },
      otpSent: { title: 'OTP Sent', message: 'A new OTP has been sent to your email' },
      error: { title: 'Error', message: 'An error occurred. Please try again.' }
    }
  };

  // ===== DOM Elements =====
  const otpInput = document.getElementById('otpInput');
  const verifyBtn = document.getElementById('verifyBtn');
  const verifyForm = document.getElementById('verifyOtpForm');
  const resendBtn = document.getElementById('resendBtn');
  const resendCounter = document.getElementById('resendCounter');
  const countdown = document.getElementById('countdown');
  const resendText = document.getElementById('resendText');
  const backLink = document.getElementById('backLink');
  const usernameInput = document.getElementById('username');
  const contextInput = document.getElementById('context');
  const otpError = document.getElementById('otpError');
  const notificationToast = new bootstrap.Toast(document.getElementById('notificationToast'));
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');

  // ===== Get URL Parameters =====
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('username');
  const context = urlParams.get('context');

  // ===== Initialize =====
  usernameInput.value = username;
  contextInput.value = context;
  setBackLink();
  initializeResendCountdown(); // Initialize countdown on page load

  // ===== Helper Functions =====

  function setBackLink() {
    const links = {
      registration: { href: '/register', text: 'Back to Registration' },
      reset: { href: '/reset', text: 'Back to Password Reset' }
    };

    const link = links[context] || links.registration;
    backLink.href = link.href;
    backLink.textContent = link.text;
  }

  function showNotification(type, customTitle = null, customMessage = null) {
    const notification = UI_TEXT.notifications[type] || UI_TEXT.notifications.error;
    toastTitle.textContent = customTitle || notification.title;
    toastMessage.textContent = customMessage || notification.message;

    const toastElement = document.getElementById('notificationToast');
    toastElement.className = 'toast';
    if (type === 'verifySuccess' || type === 'otpSent') {
      toastElement.classList.add('text-success');
    } else if (type === 'error' || type === 'verifyFailed' || type === 'invalidInput') {
      toastElement.classList.add('text-danger');
    }

    notificationToast.show();
  }

  function updateResendCounter(seconds) {
    countdown.textContent = seconds;
  }

  function setButtonLoading(button, isLoading, text) {
    button.disabled = isLoading;
    button.classList.toggle('is-loading', isLoading);
  }

  function getEndpoint() {
    return CONFIG.endpoints[context];
  }

  function clearOtpError() {
    otpInput.classList.remove('is-invalid');
    otpError.textContent = '';
  }

  // ===== OTP Input Validation =====

  otpInput.addEventListener('input', function() {
    clearOtpError();

    if (this.value.length === CONFIG.otp.length && CONFIG.otp.regex.test(this.value)) {
      verifyBtn.disabled = false;
    } else {
      verifyBtn.disabled = true;
    }
  });

  // ===== OTP Verification =====

  verifyForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const otp = otpInput.value.trim();

    if (!otp || otp.length !== CONFIG.otp.length) {
      showNotification('invalidInput');
      return;
    }

    setButtonLoading(verifyBtn, true);

    try {
      const endpoint = getEndpoint().verify;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('verifySuccess');

        setTimeout(() => {
          if (context === 'registration') {
            window.location.href = `/login?verified=true&username=${encodeURIComponent(username)}`;
          } else if (context === 'reset') {
            window.location.href = `/reset?step=3&username=${encodeURIComponent(username)}`;
          }
        }, CONFIG.timer.redirectDelay);
      } else {
        showNotification('verifyFailed', null, data.message);
        otpInput.classList.add('is-invalid');
        setButtonLoading(verifyBtn, false);
      }
    } catch {
      showNotification('error');
      setButtonLoading(verifyBtn, false);
    }
  });

  // ===== Resend OTP =====

  resendBtn.addEventListener('click', async function() {
    setButtonLoading(resendBtn, true);

    try {
      const endpoint = getEndpoint().resend;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('otpSent');
        otpInput.value = '';
        clearOtpError();
        verifyBtn.disabled = true;
        startResendCountdown();
      } else {
        showNotification('error', null, data.message);
        setButtonLoading(resendBtn, false);
      }
    } catch {
      showNotification('error');
      setButtonLoading(resendBtn, false);
    }
  });

  // ===== Resend Countdown Timer (2 minutes) =====

  function initializeResendCountdown() {
    // Initialize countdown on page load without showing "Resending..." text
    let remainingSeconds = CONFIG.timer.resend;
    resendBtn.disabled = true;
    resendCounter.classList.remove('d-none');
    updateResendCounter(remainingSeconds);

    const interval = setInterval(() => {
      remainingSeconds--;
      updateResendCounter(remainingSeconds);

      if (remainingSeconds === 0) {
        clearInterval(interval);
        resendCounter.classList.add('d-none');
        resendText.textContent = UI_TEXT.resend.default;
        resendBtn.disabled = false;
      }
    }, 1000);
  }

  function startResendCountdown() {
    // Start countdown when user manually clicks resend button
    let remainingSeconds = CONFIG.timer.resend;
    resendBtn.disabled = true;
    resendText.textContent = UI_TEXT.resend.sending;
    resendCounter.classList.remove('d-none');
    updateResendCounter(remainingSeconds);

    const interval = setInterval(() => {
      remainingSeconds--;
      updateResendCounter(remainingSeconds);

      if (remainingSeconds === 0) {
        clearInterval(interval);
        resendCounter.classList.add('d-none');
        resendText.textContent = UI_TEXT.resend.default;
        resendBtn.disabled = false;
      }
    }, 1000);
  }
});
