"use client";

// TODO
// fix change qty
// fix remove item
// add item by search from the drop down
// create new item button
// create check sections (all pages)
// see check when clicking on check history
//make header mobile responsive
//fix status in admin

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import "./Admin.css";
import { apiUrl } from "@/lib/api";
let router;
const role = "Admin"; // Temp

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

import AuthGuard from "@/components/AuthGuard";
export default function AdminPageWrapper() {
  return (
    <AuthGuard>
      <AdminPage />
    </AuthGuard>
  );
}
function handleLogout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  router.push("/login");
}

function statusOf(a) {
  return a.status || "unchecked";
}
function formatTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.slice(0, 5); // HH:MM
}

function AdminPage() {
  router = useRouter();

  const [ambulances, setAmbulances] = useState([]);
  const [itemsList, setItemsList] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState(null);

  const [activeTab, setActiveTab] = useState("info"); // "history" | "info"
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(todayISO());

  const [newItemName, setNewItemName] = useState("");
  const [newItemRequired, setNewItemRequired] = useState("1");

  const [editingRequiredItem, setEditingRequiredItem] = useState(null);
  const [requiredDraft, setRequiredDraft] = useState("");

  const [toasts, setToasts] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAddAmbForm, setShowAddAmbForm] = useState(false);
  const [newAmbName, setNewAmbName] = useState("");
  const [newAmbCode, setNewAmbCode] = useState("");

  const [history, setHistory] = useState([]);

  const selected = ambulances.find((a) => a.id === selectedAmbulanceId);

  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access");

    fetch(apiUrl("/api/ambulances/"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setAmbulances(data));
  }, []);

  const itemsSorted = useMemo(() => {
    if (!selected) return [];

    return (selected.templates || []).map((t) => ({
      id: t.id,
      name: t.item_name,
      required: t.required_quantity,
    }));
  }, [selected]);

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) {
      router.push("/login");
      return;
    }

    fetch(apiUrl("/api/me/"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .catch(() => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        router.push("/login");
      });
  }, []);

  function pushToast(message, type = "success", ttl = 3500) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  }

  function openModal(id) {
    setSelectedAmbulanceId(id);
    setActiveTab("info");

    setSelectedHistoryDate(todayISO());

    setNewItemName("");
    setNewItemRequired("1");

    setEditingRequiredItem(null);
    setRequiredDraft("");

    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedAmbulanceId(null);
    setEditingRequiredItem(null);
    setRequiredDraft("");
  }

  const summary = useMemo(() => {
    let ready = 0;
    let partial = 0;
    let critical = 0;
    let unchecked = 0;

    ambulances.forEach((a) => {
      const st = statusOf(a);
      if (st === "unchecked") unchecked++;
      else if (st === "ready") ready++;
      else if (st === "partial") partial++;
      else critical++;
    });

    return { ready, partial, critical, unchecked };
  }, [ambulances]);

  const kpis = useMemo(() => {
    const totalFleet = ambulances.length;

    const readyCount = ambulances.filter((a) => a.status === "ready").length;

    const fleetReadyPct =
      totalFleet === 0 ? 0 : Math.round((readyCount / totalFleet) * 100);

    return {
      totalFleet,
      fleetReadyPct,
      checksToday: 0,
      openIssues: ambulances.reduce(
        (sum, a) => sum + (a.missing_count || 0),
        0,
      ),
    };
  }, [ambulances]);

  useEffect(() => {
    if (!selected) return;

    const token = localStorage.getItem("access");

    fetch(apiUrl(`/api/checks/${selected.id}/`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .catch((err) => console.error(err));
  }, [selected]);

  useEffect(() => {
    const token = localStorage.getItem("access");

    fetch(apiUrl("/api/items/"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setItemsList(data));
  }, []);

  const historyDates = useMemo(() => {
    return Array.from(new Set(history.map((h) => h.date))).sort((a, b) =>
      a < b ? 1 : -1,
    );
  }, [history]);

  const historyForSelectedDate = useMemo(() => {
    const day = history.filter(
      (h) => h.date === selectedHistoryDate && h.shift === "day",
    );
    const night = history.filter(
      (h) => h.date === selectedHistoryDate && h.shift === "night",
    );
    return { Day: day, Night: night };
  }, [history, selectedHistoryDate]);

  function formatDateOption(d) {
    const t = todayISO();
    if (d === t) return `Today (${d})`;
    return d;
  }

  const filteredAmbulances = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return ambulances.filter((a) => {
      const st = statusOf(a);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (!q) return true;
      return (a.code || "").toLowerCase().includes(q);
    });
  }, [ambulances, searchQuery, statusFilter]);

  async function addAmbulance() {
    if (!newAmbCode.trim()) {
      alert("Please enter ambulance code");
      return;
    }

    const token = localStorage.getItem("access");

    const res = await fetch(apiUrl("/api/ambulances/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: newAmbCode.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to add ambulance");
      return;
    }

    setAmbulances((prev) => [
      ...prev,
      {
        id: data.id,
        code: data.code,
        status: "unchecked",
        missing_count: 0,
        templates: [],
      },
    ]);

    setNewAmbCode("");
    setShowAddAmbForm(false);
  }

  async function removeItem(templateId) {
    const token = localStorage.getItem("access");

    await fetch(apiUrl(`/api/templates/${templateId}/`), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    window.location.reload();
  }

  async function addNewItem() {
    if (!selected || !newItemName) return;

    const alreadyExists = selected.templates.some(
      (t) => t.item_name === newItemName,
    );

    if (alreadyExists) {
      setError("Item already exists in this ambulance");
      return;
    }

    const token = localStorage.getItem("access");

    const res = await fetch(apiUrl("/api/templates/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ambulance: selected.id,
        item_name: newItemName,
        required_quantity: Number(newItemRequired),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to add item");
      return;
    }

    window.location.reload();
  }

  function beginEditRequired(templateId, currentRequired) {
    setEditingRequiredItem(templateId);
    setRequiredDraft(String(currentRequired));
  }

  async function commitEditRequired(templateId) {
    const token = localStorage.getItem("access");

    await fetch(apiUrl(`/api/templates/${templateId}/`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        required_quantity: Number(requiredDraft),
      }),
    });

    setEditingRequiredItem(null);
    window.location.reload();
  }

  function cancelEditRequired() {
    setEditingRequiredItem(null);
    setRequiredDraft("");
  }

  return (
    <div className="admin-page">
      <div className="navbar">
        <div className="nav-left">
          <img
            className="nav-logo"
            src="/assets/logo-white-cropped.png"
            alt="RedReady"
          />
          <div className="nav-brand">RedReady</div>
        </div>

        <div className="nav-center">
          <a className="nav-link active" href="/admin">
            Admin
          </a>
        </div>

        <div className="nav-right">
          <div className="role">Admin</div>

          <button className="logout-btn" onClick={handleLogout} type="button">
            Logout
          </button>

          <div className="avatar" />
        </div>
      </div>

      <div className="content">
        <div className="kpi-row">
          <div className="kpi-card">
            <div>
              <div className="kpi-value">{kpis.totalFleet}</div>
              <div className="kpi-label">Total Fleet</div>
            </div>
            <div className="kpi-icon">🚚</div>
          </div>

          <div className="kpi-card kpi-ready">
            <div>
              <div className="kpi-value kpi-green">{kpis.fleetReadyPct}%</div>
              <div className="kpi-label">Fleet Ready</div>
            </div>
            <div className="kpi-icon kpi-green">✓</div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-value">{kpis.checksToday}</div>
              <div className="kpi-label">Checks Today</div>
            </div>
            <div className="kpi-icon">📋</div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-value kpi-amber">{kpis.openIssues}</div>
              <div className="kpi-label">Open Issues</div>
            </div>
            <div className="kpi-icon kpi-amber">⚠</div>
          </div>
        </div>

        <div className="summary-row">
          <div className="summary-card ready">
            <div className="summary-number">{summary.ready}</div>
            <div className="summary-label">Ready</div>
          </div>

          <div className="summary-card partial">
            <div className="summary-number">{summary.partial}</div>
            <div className="summary-label">Partial</div>
          </div>

          <div className="summary-card critical">
            <div className="summary-number">{summary.critical}</div>
            <div className="summary-label">Critical</div>
          </div>

          <div className="summary-card unchecked">
            <div className="summary-number">{summary.unchecked}</div>
            <div className="summary-label">Unchecked</div>
          </div>
        </div>

        <div className="fleet-head">
          <div className="fleet-title">
            <span className="fleet-emoji">🚑</span> Fleet Status
          </div>
          <div className="fleet-subtitle">Current status of all ambulances</div>
        </div>

        {role === "Admin" && (
          <div className="fleet-add-row">
            <button
              className="add-ambulance-btn"
              type="button"
              onClick={() => setShowAddAmbForm((s) => !s)}
            >
              {showAddAmbForm ? "Cancel" : "New Ambulance"}
            </button>

            {showAddAmbForm && (
              <div className="add-ambulance-form">
                <input
                  className="add-ambulance-input small"
                  placeholder="Code (optional)"
                  value={newAmbCode}
                  onChange={(e) => setNewAmbCode(e.target.value)}
                />
                <button
                  className="add-ambulance-confirm"
                  onClick={addAmbulance}
                  type="button"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )}

        <div className="fleet-controls">
          <input
            className="fleet-search"
            placeholder="Search by code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="fleet-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="ready">Ready</option>
            <option value="partial">Partial</option>
            <option value="critical">Critical</option>
            <option value="unchecked">Not Checked</option>
          </select>
        </div>

        <div className="fleet-grid">
          {filteredAmbulances.length === 0 ? (
            <div className="fleet-empty">No ambulances match your search.</div>
          ) : (
            filteredAmbulances.map((a) => {
              const st = statusOf(a);
              return (
                <button
                  key={a.id}
                  className={`fleet-card ${st}`}
                  onClick={() => openModal(a.id)}
                  type="button"
                >
                  <div className="fleet-left">
                    <div className={`fleet-dot ${st}`} />
                    <div className="fleet-text">
                      <div className="fleet-code">{a.code}</div>
                    </div>
                  </div>

                  <div className={`fleet-pill ${st}`}>{"✓ Active"}</div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {isModalOpen && selected && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selected.code}</div>
              <button
                className="modal-close"
                onClick={closeModal}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
                onClick={() => setActiveTab("info")}
                type="button"
              >
                Ambulance Info
              </button>

              <button
                className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
                type="button"
              >
                Check History
              </button>
            </div>

            <div className="modal-body">
              {activeTab === "info" && (
                <div className="info-wrap">
                  <div className="info-table">
                    <div className="info-row info-row-head">
                      <div className="info-col-name">Item</div>
                      <div className="info-col-actions">Required</div>
                      <div className="info-col-remove"></div>
                    </div>

                    {itemsSorted.map((it) => {
                      const isEditing = editingRequiredItem === it.id;

                      return (
                        <div className="info-row" key={it.id}>
                          <div className="info-col-name">{it.name}</div>

                          <div className="info-col-qty">{it.required}</div>

                          <div className="info-col-actions">
                            {role !== "Admin" ? (
                              <span className="required-readonly">
                                {it.required}
                              </span>
                            ) : isEditing ? (
                              <div className="inline-edit">
                                <input
                                  className="required-input"
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={requiredDraft}
                                  autoFocus
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "");
                                    setRequiredDraft(v);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      commitEditRequired(it.id);
                                    if (e.key === "Escape")
                                      cancelEditRequired();
                                  }}
                                />

                                <button
                                  className="edit-confirm"
                                  type="button"
                                  onClick={() => commitEditRequired(it.id)}
                                  disabled={
                                    !requiredDraft || Number(requiredDraft) < 1
                                  }
                                >
                                  ✓
                                </button>

                                <button
                                  className="edit-cancel"
                                  type="button"
                                  onClick={cancelEditRequired}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                className="required-edit-btn"
                                type="button"
                                onClick={() =>
                                  beginEditRequired(it.id, it.required)
                                }
                                title="Click to edit required quantity"
                              >
                                {it.required}
                              </button>
                            )}
                          </div>

                          <div className="info-col-remove">
                            <button
                              className="remove-item-dark"
                              onClick={() => removeItem(it.id)}
                              type="button"
                              title="Remove item"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="add-item-dark">
                    <select
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="input"
                    >
                      <option value="">Select item</option>

                      {itemsList.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <input
                      className="add-item-dark-input small"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newItemRequired}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setNewItemRequired(v);
                      }}
                      placeholder="Required"
                    />

                    <button
                      className="add-item-dark-btn"
                      onClick={addNewItem}
                      type="button"
                    >
                      Add Item
                    </button>
                  </div>

                  {error && <div className="error">{error}</div>}
                </div>
              )}

              {activeTab === "history" && (
                <div className="history-wrap">
                  <div className="history-topbar">
                    <div className="history-date-big">
                      {selectedHistoryDate === todayISO()
                        ? `Today (${selectedHistoryDate})`
                        : selectedHistoryDate}
                    </div>

                    <select
                      className="history-select"
                      value={selectedHistoryDate}
                      onChange={(e) => setSelectedHistoryDate(e.target.value)}
                    >
                      {historyDates.length === 0 ? (
                        <option
                          value={todayISO()}
                        >{`Today (${todayISO()})`}</option>
                      ) : (
                        historyDates.map((d) => (
                          <option key={d} value={d}>
                            {formatDateOption(d)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {historyForSelectedDate.Day.length === 0 &&
                  historyForSelectedDate.Night.length === 0 ? (
                    <div className="empty-history">
                      No checks recorded for this date.
                    </div>
                  ) : (
                    <div className="history-day">
                      <div className="history-shifts">
                        <div className="history-col">
                          <div className="history-shift-title">Day Shift</div>
                          {historyForSelectedDate.Day.length === 0 ? (
                            <div className="history-empty">No checks</div>
                          ) : (
                            historyForSelectedDate.Day.map((h) => (
                              <div className="history-row" key={h.id}>
                                <div className="history-by">
                                  {h.user_full_name}
                                </div>
                                <div className="history-time">
                                  {formatTime(h.time)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="history-col">
                          <div className="history-shift-title">Night Shift</div>
                          {historyForSelectedDate.Night.length === 0 ? (
                            <div className="history-empty">No checks</div>
                          ) : (
                            historyForSelectedDate.Night.map((h) => (
                              <div className="history-row" key={h.id}>
                                <div className="history-by">
                                  {h.user_full_name}
                                </div>
                                <div className="history-time">{h.time}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
