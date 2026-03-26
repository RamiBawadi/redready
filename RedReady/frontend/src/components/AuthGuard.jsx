"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import "./AuthGuard.css";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access");

    //  Not logged in
    if (!token) {
      router.replace("/login");
      return;
    }

    //  Verify token
    fetch("http://127.0.0.1:8000/api/me/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setLoading(false);
      })
      .catch(() => {
        localStorage.clear();
        router.replace("/login");
      });
  }, []);

  if (loading) {
    return (
      <div className="auth-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  return children;
}
