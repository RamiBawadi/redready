"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./Login.css";

export default function LoginPage() {
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const bgStyle = useMemo(
    () => ({
      backgroundImage: `url(/assets/login-bg.jpg)`,
    }),
    [],
  );

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Invalid email or password");
        return;
      }

      // Save JWT tokens
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      router.push("/home");
    } catch (err) {
      setError("Server connection failed.");
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" style={bgStyle} />
      <div className="login-overlay" />

      <div className="brand">
        <div className="brand-row">
          <img
            className="brand-logo"
            src="/assets/logo-white-cropped.png"
            alt="RedReady logo"
          />
          <div className="brand-name">RedReady</div>
        </div>
        <div className="brand-subtitle">
          Ambulance Inventory &amp; Logistics System
        </div>
      </div>

      <div className="login-center">
        <div className="login-card">
          <div className="login-title">Login</div>

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-form-top">
              <div className="form-group">
                <label className="label">Email</label>
                <input
                  className="input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <input
                  className="input"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div
                className="forgot"
                onClick={() =>
                  setError("Forgot Password is not implemented yet.")
                }
              >
                Forgot Password?
              </div>

              {error ? <div className="error">{error}</div> : null}
            </div>

            <div className="login-form-bottom">
              <button className="login-btn" type="submit">
                Login
              </button>
              <div className="login-foot">
                For logistics staff, admins, and volunteers
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
