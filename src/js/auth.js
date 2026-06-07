/**
 * AUTHENTICATION CONTROLLER — phone.com
 * 
 * Handles WhatsApp Business API authentication flow (OTP delivery and verification).
 */

export const PhoneAuth = (() => {
  let btnRequestOTP, inputPhone, authContainer;
  let btnVerifyOTP, inputOTP, otpContainer;

  function init() {
    authContainer = document.getElementById('whatsapp-auth-container');
    btnRequestOTP = document.getElementById('btn-request-otp');
    inputPhone = document.getElementById('auth-phone-input');
    
    otpContainer = document.getElementById('whatsapp-otp-container');
    btnVerifyOTP = document.getElementById('btn-verify-otp');
    inputOTP = document.getElementById('auth-otp-input');

    if (btnRequestOTP) {
      btnRequestOTP.addEventListener('click', requestWhatsAppOTP);
    }
    
    if (btnVerifyOTP) {
      btnVerifyOTP.addEventListener('click', verifyWhatsAppOTP);
    }
  }

  async function requestWhatsAppOTP() {
    const phone = inputPhone.value.trim();
    if (!phone) {
      alert("Please enter a valid phone number with country code.");
      return;
    }

    btnRequestOTP.textContent = "Sending...";
    btnRequestOTP.disabled = true;

    try {
      // STUB: This would call your backend endpoint, which in turn calls the Meta Business API 
      // to send the WhatsApp authentication template to the user's phone.
      console.log(`[PhoneAuth] Requesting WhatsApp OTP for: ${phone}`);
      
      // Simulate network delay
      await new Promise(r => setTimeout(r, 1000));
      
      authContainer.classList.add('hidden');
      otpContainer.classList.remove('hidden');
      
    } catch (e) {
      console.error("[PhoneAuth] Failed to request OTP", e);
      alert("Failed to send code via WhatsApp. Please check your connection.");
    } finally {
      btnRequestOTP.textContent = "Send Code via WhatsApp";
      btnRequestOTP.disabled = false;
    }
  }

  async function verifyWhatsAppOTP() {
    const code = inputOTP.value.trim();
    if (!code || code.length !== 6) {
      alert("Please enter the 6-digit code.");
      return;
    }

    btnVerifyOTP.textContent = "Verifying...";
    btnVerifyOTP.disabled = true;

    try {
      // STUB: This would send the OTP to your backend to verify against the stored session.
      console.log(`[PhoneAuth] Verifying OTP code: ${code}`);
      
      // Simulate network delay
      await new Promise(r => setTimeout(r, 1000));
      
      alert("WhatsApp Authentication Successful! Your account is now synced.");
      
      // Hide auth modal and proceed to the app
      const authModal = document.getElementById('auth-modal');
      if (authModal) authModal.classList.add('hidden');

    } catch (e) {
      console.error("[PhoneAuth] Failed to verify OTP", e);
      alert("Invalid code. Please try again.");
    } finally {
      btnVerifyOTP.textContent = "Verify & Connect";
      btnVerifyOTP.disabled = false;
    }
  }

  return {
    init
  };
})();
