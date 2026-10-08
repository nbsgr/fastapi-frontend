import { useEffect } from "react";
import "./ResetPassword.css";
import { callApi, getSession, BASE_URL } from "../api/api";

export default function ResetPassword() {
  function checkToken() {
    const authToken = getSession("token");

    if (authToken) {
      window.location.replace("/dashboard");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    const token = params.get("token");

    const messageDiv = document.querySelector(".cgpt-rp-message");

    if (!email || !token) {
      if (messageDiv) {
        messageDiv.textContent = "Invalid or expired reset link";
      }
      return;
    }

    localStorage.setItem("resetEmail", email);
    localStorage.setItem("resetToken", token);
  }

  function submitResetPassword() {
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");
    const email = localStorage.getItem("resetEmail");
    const token = localStorage.getItem("resetToken");

    newPassword.style.border = "";
    confirmPassword.style.border = "";

    if (newPassword.value === "") {
      newPassword.style.border = "1px solid red";
      newPassword.focus();
      return;
    }

    if (confirmPassword.value === "") {
      confirmPassword.style.border = "1px solid red";
      confirmPassword.focus();
      return;
    }

    if (newPassword.value !== confirmPassword.value) {
      newPassword.style.border = "1px solid red";
      confirmPassword.style.border = "1px solid red";
      newPassword.focus();
      return;
    }

    const btn = document.querySelector(".cgpt-rp-button");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Resetting...";
    }

    const data = {
      email: email,
      token: token,
      password: newPassword.value
    };

    callApi(
      "POST",
      `${BASE_URL}/users/reset-password`,
      data,
      handleResponse
    );
  }

  function handleResponse(res) {
    const btn = document.querySelector(".cgpt-rp-button");
    const messageDiv = document.querySelector(".cgpt-rp-message");

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Reset password";
    }

    if (res.status === 200) {
      if (messageDiv) {
        messageDiv.textContent = "Password reset successful! Redirecting to login...";
      }

      setTimeout(function redirectToLogin() {
        window.location.replace("/login");
      }, 2000);
    } else {
      if (messageDiv) {
        messageDiv.textContent = res.message;
      }
    }
  }

  useEffect(checkToken, []);

  return (
    <div className="cgpt-rp-page">
      <div className="cgpt-rp-card">
        <h2 className="cgpt-rp-title">Reset password</h2>

        <input
          type="password"
          id="newPassword"
          placeholder="New password"
          className="cgpt-rp-input"
        />

        <input
          type="password"
          id="confirmPassword"
          placeholder="Confirm password"
          className="cgpt-rp-input"
        />

        <button
          onClick={submitResetPassword}
          className="cgpt-rp-button"
        >
          Reset password
        </button>

        <p className="cgpt-rp-message"></p>
      </div>
    </div>
  );
}