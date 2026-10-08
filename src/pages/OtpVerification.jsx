import { useEffect } from "react";
import "./OtpVerification.css";
import { callApi, getSession, BASE_URL } from "../api/api";

export default function OtpVerification() {
  function checkToken() {
    const token = getSession("token");

    if (token) {
      window.location.replace("/dashboard");
      return;
    }

    const signupData = localStorage.getItem("signupData");

    if (!signupData) {
      window.location.replace("/signup");
      return;
    }
  }

  function verifyOtp() {
    const otp = document.getElementById("otp");
    const signupDataRaw = localStorage.getItem("signupData");

    if (!signupDataRaw) {
      alert("Signup data missing. Please signup again.");
      window.location.replace("/signup");
      return;
    }

    if (otp.value.trim() === "") {
      otp.style.border = "1px solid red";
      otp.focus();
      return;
    }

    otp.style.border = "";

    const signupData = JSON.parse(signupDataRaw);

    const data = {
      email: signupData.email,
      otp: otp.value.trim()
    };

    const btn = document.querySelector(".chatgpt-otp-button");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Verifying...";
    }

    callApi(
      "POST",
      `${BASE_URL}/users/signup/verify-otp`,
      data,
      verifyResponse
    );
  }

  function verifyResponse(response) {
    const btn = document.querySelector(".chatgpt-otp-button");

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Verify & Signup";
    }

    if (response && response.status === 200) {
      alert("Signup successful! You can now log in.");
      localStorage.removeItem("signupData");
      window.location.replace("/login");
    } else {
      const messageDiv = document.querySelector(".chatgpt-otp-error");
      if (messageDiv) {
        messageDiv.textContent = response?.message || "OTP Verification failed";
      }
    }
  }

  useEffect(checkToken, []);

  return (
    <div className="chatgpt-otp-page">
      <div className="chatgpt-otp-card">
        <h2 className="chatgpt-otp-title">Verify OTP</h2>

        <input
          type="text"
          id="otp"
          placeholder="Enter 6-digit OTP"
          className="chatgpt-otp-input"
        />

        <button
          onClick={verifyOtp}
          className="chatgpt-otp-button"
        >
          Verify & Signup
        </button>

        <p className="chatgpt-otp-error"></p>
      </div>
    </div>
  );
}