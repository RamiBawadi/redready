"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./Logistics.css";

const SHARED_ITEMS = [
  { id: "aed", name: "Defibrillator (AED)", requiredQty: 1 },
  { id: "first-aid", name: "First Aid Kit", requiredQty: 1 },
  { id: "oxygen", name: "Oxygen Cylinder", requiredQty: 100 },
  { id: "gloves", name: "Spare Gloves", requiredQty: 20 },
  { id: "stretcher", name: "Stretcher", requiredQty: 1 },
];

const AMBULANCE_CARDS = [
  {
    id: 1,
    title: "Ambulance 1",
    status: "Unchecked",
    lastChecked: "Not checked yet",
    issueCount: 4,
    items: SHARED_ITEMS,
  },
  {
    id: 2,
    title: "Ambulance 2",
    status: "Unchecked",
    lastChecked: "Not checked yet",
    issueCount: 2,
    items: SHARED_ITEMS,
  },
  {
    id: 3,
    title: "Ambulance 3",
    status: "Partial",
    lastChecked: "Today at 08:20",
    issueCount: 1,
    items: SHARED_ITEMS,
  },
  {
    id: 4,
    title: "Ambulance 4",
    status: "Ready",
    lastChecked: "Today at 09:10",
    issueCount: 0,
    items: SHARED_ITEMS,
  },
  {
    id: 5,
    title: "Ambulance 5",
    status: "Critical",
    lastChecked: "Yesterday at 22:40",
    issueCount: 5,
    items: SHARED_ITEMS,
  },
  {
    id: 6,
    title: "Ambulance 6",
    status: "Partial",
    lastChecked: "Yesterday at 18:30",
    issueCount: 2,
    items: SHARED_ITEMS,
  },
];

const STATUS_META = {
  Ready: {
    className: "ready",
    buttonLabel: "All good",
    disabled: true,
  },
  Partial: {
    className: "partial",
    buttonLabel: "Resolve",
    disabled: false,
  },
  Critical: {
    className: "critical",
    buttonLabel: "Resolve",
    disabled: false,
  },
  Unchecked: {
    className: "unchecked",
    buttonLabel: "Check",
    disabled: false,
  },
};

function formatLastChecked(text) {
  if (!text) return "Not checked yet";
  return text;
}

import AuthGuard from "@/components/AuthGuard";
export default function LogisticsPageWrapper() {
  return (
    <AuthGuard>
      <LogisticsPage />
    </AuthGuard>
  );
}

function LogisticsPage() {
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const [ambulances, setAmbulances] = useState(() => {
    try {
      const raw = localStorage.getItem("logisticsAmbulances");
      if (raw) return JSON.parse(raw);
    } catch (err) {}
    return AMBULANCE_CARDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("logisticsAmbulances", JSON.stringify(ambulances));
    } catch (err) {}
  }, [ambulances]);

  function handleLogout() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    router.push("/login");
  }

  function markResolved(id) {
    setAmbulances((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          status: "Ready",
          issueCount: 0,
          lastChecked: "Just now",
        };
      }),
    );
  }

  function addIssue(id) {
    setAmbulances((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const nextIssue = (a.issueCount || 0) + 1;
        const nextStatus =
          nextIssue === 0 ? "Ready" : nextIssue <= 2 ? "Partial" : "Critical";
        return {
          ...a,
          issueCount: nextIssue,
          status: nextStatus,
          lastChecked: "Just now",
        };
      }),
    );
  }

  const totalMissing = useMemo(() => {
    return ambulances.reduce((acc, a) => acc + (a.issueCount || 0), 0);
  }, [ambulances]);

  return (
    <div className="logistics-page">
      <header className="logistics-header">
        <div className="logistics-header__left">
          <img
            className="logistics-header__logo"
            src="/assets/logo-white-cropped.png"
            alt="RedReady"
          />
          <span className="logistics-header__brand-name">RedReady</span>
        </div>

        <div className="logistics-header__center">
          <span className="logistics-header__tab">Logistics</span>
        </div>

        <div className="logistics-header__right">
          <span className="logistics-header__role">{role || "Logistics"}</span>
          <button
            className="logistics-header__exit"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
          <div className="logistics-header__avatar" />
        </div>
      </header>

      <main className="logistics-content">
        <div className="fleet-status-head">
          <h1 className="fleet-status-title">Missing Items</h1>
          <p className="fleet-status-subtitle">
            Track missing items across the fleet and resolve issues.
          </p>
          <p className="fleet-status-subtitle">
            Total missing items: <strong>{totalMissing}</strong>
          </p>
        </div>

        <section className="ambulance-grid" aria-label="Logistics ambulances">
          {ambulances.map((ambulance) => {
            const meta = STATUS_META[ambulance.status];
            const issues = ambulance.issueCount || 0;

            return (
              <article
                key={ambulance.id}
                className={`ambulance-card ambulance-card--${meta.className}`}
              >
                <div className="ambulance-card__icon-wrap">
                  <img
                    className="ambulance-card__icon"
                    src="/assets/ambulance-icon.png"
                    alt="Ambulance"
                  />
                </div>

                <div className="ambulance-card__body">
                  <div className="ambulance-card__top">
                    <div>
                      <h3 className="ambulance-card__title">
                        {ambulance.title}
                      </h3>
                      <p className="ambulance-card__last-check">
                        {formatLastChecked(ambulance.lastChecked)}
                      </p>
                    </div>
                    <div
                      className={`ambulance-card__badge ambulance-card__badge--${meta.className}`}
                    >
                      {ambulance.status}
                    </div>
                  </div>

                  <div
                    className={`ambulance-card__issues ambulance-card__issues--${meta.className}`}
                  >
                    {issues} missing item{issues === 1 ? "" : "s"}
                  </div>

                  <div className="ambulance-card__actions">
                    <button
                      className="ambulance-card__button"
                      type="button"
                      onClick={() => markResolved(ambulance.id)}
                      disabled={meta.disabled}
                    >
                      {meta.buttonLabel}
                    </button>
                    <button
                      className="ambulance-card__button ambulance-card__button--secondary"
                      type="button"
                      onClick={() => addIssue(ambulance.id)}
                    >
                      Add issue
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
