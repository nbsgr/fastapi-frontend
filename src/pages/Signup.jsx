import { useEffect } from "react";
import "./Signup.css";
import { callApi, getSession, BASE_URL } from "../api/api";

export default function Signup() {
  function checkToken() {
    const token = getSession("token");
    if (token) {
      window.location.replace("/dashboard");
    }
  }

  function requestOtp() {
    const username = document.getElementById("username");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    username.style.border = "";
    email.style.border = "";
    password.style.border = "";
    confirmPassword.style.border = "";

    if (username.value.trim() === "") {
      username.style.border = "1px solid red";
      username.focus();
      return;
    }

    if (email.value.trim() === "") {
      email.style.border = "1px solid red";
      email.focus();
      return;
    }

    if (password.value === "") {
      password.style.border = "1px solid red";
      password.focus();
      return;
    }

    if (confirmPassword.value === "") {
      confirmPassword.style.border = "1px solid red";
      confirmPassword.focus();
      return;
    }

    if (password.value !== confirmPassword.value) {
      password.style.border = "1px solid red";
      confirmPassword.style.border = "1px solid red";
      password.focus();
      return;
    }

    const btn = document.querySelector(".chatgpt-signup-button");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending OTP...";
    }

    const data = {
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value
    };

    callApi(
      "POST",
      `${BASE_URL}/users/signup/request-otp`,
      data,
      handleOtpResponse
    );
  }

  function handleOtpResponse(response) {
    const btn = document.querySelector(".chatgpt-signup-button");
    const errorDiv = document.querySelector(".chatgpt-signup-error");

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Request OTP";
    }

    if (response && response.status === 200) {
      const signupData = {
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      };

      localStorage.setItem("signupData", JSON.stringify(signupData));
      window.location.replace("/verify-otp");
    } else {
      if (errorDiv) {
        errorDiv.textContent = response?.message || "Failed to send OTP";
      }
    }
  }

  useEffect(checkToken, []);

  return (
    <div className="chatgpt-signup-page">
      <div className="chatgpt-signup-card">
        <h2 className="chatgpt-signup-title">Sign up</h2>

        <input
          type="text"
          id="username"
          placeholder="Username"
          className="chatgpt-signup-input"
        />

        <input
          type="email"
          id="email"
          placeholder="Email address"
          className="chatgpt-signup-input"
        />

        <input
          type="password"
          id="password"
          placeholder="Password"
          className="chatgpt-signup-input"
        />

        <input
          type="password"
          id="confirmPassword"
          placeholder="Confirm password"
          className="chatgpt-signup-input"
        />

        <button
          onClick={requestOtp}
          className="chatgpt-signup-button"
        >
          Request OTP
        </button>

        <p className="chatgpt-signup-error"></p>
      </div>
    </div>
  );
}