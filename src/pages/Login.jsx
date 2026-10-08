import { useEffect } from "react";
import "./Login.css";
import { callApi, setSession, getSession, BASE_URL } from "../api/api";

export default function Login() {
  function checkToken() {
    const token = getSession("token");
    if (token) {
      window.location.replace("/dashboard");
    }
  }

  function login() {
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    email.style.border = "";
    password.style.border = "";

    if (email.value === "") {
      email.style.border = "1px solid red";
      email.focus();
      return;
    }

    if (password.value === "") {
      password.style.border = "1px solid red";
      password.focus();
      return;
    }

    const btn = document.querySelector(".chatgpt-login-button");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Logging in...";
    }

    const data = {
      emailorusername: email.value,
      password: password.value
    };

    callApi(
      "POST",
      `${BASE_URL}/users/login`,
      data,
      handleLoginResponse
    );
  }

  function handleLoginResponse(res) {
    const btn = document.querySelector(".chatgpt-login-button");
    const messageDiv = document.querySelector(".chatgpt-login-message");

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Log in";
    }

    if (res && res.status === 200) {
      const token = res.data?.token || res.data;
      setSession("token", token, 1);
      window.location.replace("/dashboard");
    } else {
      if (messageDiv) {
        messageDiv.textContent = res?.message || "Login failed";
      }
    }
  }

  function goToForgotPassword() {
    window.location.replace("/forgot-password");
  }

  useEffect(checkToken, []);

  return (
    <div className="chatgpt-login-page">
      <div className="chatgpt-login-card">
        <h2 className="chatgpt-login-title">Log in</h2>

        <input
          type="text"
          id="email"
          placeholder="Email address or username"
          className="chatgpt-login-input"
        />

        <input
          type="password"
          id="password"
          placeholder="Password"
          className="chatgpt-login-input"
        />

        <button
          onClick={login}
          className="chatgpt-login-button"
        >
          Log in
        </button>

        <p
          className="chatgpt-login-forgot"
          onClick={goToForgotPassword}
        >
          Forgot password?
        </p>

        <p className="chatgpt-login-message"></p>
      </div>
    </div>
  );
}