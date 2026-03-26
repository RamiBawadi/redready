"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./RoleSelect.css";

import AuthGuard from "@/components/AuthGuard";
export default function HomeWrapper() {
  return (
    <AuthGuard>
      <Home />
    </AuthGuard>
  );
}

function Home() {
  const router = useRouter();
  const [roles, setRoles] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) {
      router.push("/login");
      return;
    }

    fetch("http://127.0.0.1:8000/api/me/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        const userRoles = data.roles || [];
        setRoles(userRoles);

        // 🚀 AUTO REDIRECT CASE
        if (userRoles.length === 1 && userRoles[0] === "volunteer") {
          router.push("/volunteer");
        }
      })
      .catch(() => {
        localStorage.clear();
        router.push("/login");
      });
  }, []);

  if (!roles) return null;

  // If only volunteer → already redirected
  if (roles.length === 1 && roles[0] === "volunteer") return null;

  return (
    <div className="role-page">
      <div className="role-container">
        <h1>Select Your Dashboard</h1>

        <div className="role-grid">
          {roles.includes("admin") && (
            <button onClick={() => router.push("/admin")}>Admin Panel</button>
          )}

          {roles.includes("logistics") && (
            <button onClick={() => router.push("/logistics")}>
              Logistics Panel
            </button>
          )}

          {roles.includes("volunteer") && (
            <button onClick={() => router.push("/volunteer")}>
              Volunteer Panel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
