import { useEffect } from "react";
import "./ForgotPassword.css";
import { callApi, getSession, BASE_URL } from "../api/api";

export default function ForgotPassword() {
  function checkToken() {
    const token = getSession("token");
    if (token) {
      window.location.replace("/dashboard");
    }
  }

  function submitForgotPassword() {
    const email = document.getElementById("email");

    email.style.border = "";

    if (email.value.trim() === "") {
      email.style.border = "1px solid red";
      email.focus();
      return;
    }

    const btn = document.querySelector(".chatgpt-fp-button");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending...";
    }

    const messageDiv = document.querySelector(".chatgpt-fp-message");
    if (messageDiv) {
      messageDiv.textContent = "";
    }

    const data = {
      email: email.value.trim()
    };

    callApi(
      "POST",
      `${BASE_URL}/users/forgot-password`,
      data,
      handleResponse
    );
  }

  function handleResponse(res) {
    const btn = document.querySelector(".chatgpt-fp-button");
    const messageDiv = document.querySelector(".chatgpt-fp-message");

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Send reset link";
    }

    if (res.status === 200) {
      if (messageDiv) {
        messageDiv.textContent = "Reset link sent to your email. Please check your inbox.";
      }
    } else {
      if (messageDiv) {
        messageDiv.textContent = res.message;
      }
    }
  }

  function goToLogin() {
    window.location.replace("/login");
  }

  useEffect(checkToken, []);

  return (
    <div className="chatgpt-fp-page">
      <div className="chatgpt-fp-card">
        <h2 className="chatgpt-fp-title">Forgot password</h2>

        <input
          type="email"
          id="email"
          placeholder="Enter your email"
          className="chatgpt-fp-input"
        />

        <button
          onClick={submitForgotPassword}
          className="chatgpt-fp-button"
        >
          Send reset link
        </button>

        <p className="chatgpt-fp-message"></p>

        <p className="chatgpt-fp-back" onClick={goToLogin}>
          Back to login
        </p>
      </div>
    </div>
  );
}