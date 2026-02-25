"use client";
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import "./Home.css";
let router;
const DEFAULT_ITEMS = [
  { name: "Defibrillator (AED)", qty: 1, required: 1 },
  { name: "First Aid Kit", qty: 1, required: 1 },
  { name: "Oxygen Cylinder", qty: 2, required: 2 },
  { name: "Spare Gloves", qty: 15, required: 20 },
  { name: "Stretcher", qty: 1, required: 1 },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeAmbulance(id) {
  return {
    id,
    name: `RESCUE-${id}`,
    code: `EMS-${2400 + id}`,
    lastChecked: "",
    history: [],
    items: DEFAULT_ITEMS.map((x) => ({ ...x })),
  };
}

function handleLogout() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  router.push("/login");
}

function statusOf(amb) {
  if (!amb.lastChecked) return "unchecked";
  return "ready";
}

export default function HomePage() {
  router = useRouter();

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
      .catch(() => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        router.push("/login");
      });
  }, []);

  // ✅ role switch; later pull from auth
  const role = "Admin"; //

  const [ambulances, setAmbulances] = useState(() => {
    try {
      const raw = localStorage.getItem("ambulances");
      if (raw) return JSON.parse(raw);
    } catch (err) {}

    const t = todayISO();
    return Array.from({ length: 6 }, (_, i) => {
      const a = makeAmbulance(i + 1);

      if (i === 0) {
        a.lastChecked = "Last checked today";
        a.history = [
          { date: t, shift: "Day", by: "Ahmad", time: "09:15" },
          { date: t, shift: "Night", by: "Maya", time: "20:40" },
          { date: "2026-02-09", shift: "Night", by: "Karim", time: "21:05" },
        ];
      }

      if (i === 1) {
        a.lastChecked = "Last checked today";
        a.history = [{ date: t, shift: "Day", by: "Rana", time: "10:05" }];
      }

      return a;
    });
  });

  useEffect(() => {
    try {
      localStorage.setItem("ambulances", JSON.stringify(ambulances));
    } catch (err) {}
  }, [ambulances]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState(null);

  const [activeTab, setActiveTab] = useState("info"); // "history" | "info"
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(todayISO());

  const [newItemName, setNewItemName] = useState("");
  const [newItemRequired, setNewItemRequired] = useState("1");

  const [editingRequiredItem, setEditingRequiredItem] = useState(null);
  const [requiredDraft, setRequiredDraft] = useState("");

  const [toasts, setToasts] = useState([]);

  function pushToast(message, type = "success", ttl = 3500) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAddAmbForm, setShowAddAmbForm] = useState(false);
  const [newAmbName, setNewAmbName] = useState("");
  const [newAmbCode, setNewAmbCode] = useState("");

  const selected = ambulances.find((a) => a.id === selectedAmbulanceId);

  function openModal(id) {
    const amb = ambulances.find((a) => a.id === id);
    setSelectedAmbulanceId(id);

    setActiveTab("info");

    const t = todayISO();
    const dates = Array.from(
      new Set((amb?.history || []).map((h) => h.date)),
    ).sort((a, b) => (a < b ? 1 : -1));
    if (dates.includes(t)) setSelectedHistoryDate(t);
    else setSelectedHistoryDate(dates[0] || t);

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
    const checked = ambulances.filter((a) => !!a.lastChecked);
    const readyCount = checked.length;

    const fleetReadyPct =
      totalFleet === 0 ? 0 : Math.round((readyCount / totalFleet) * 100);

    const t = todayISO();
    const checksToday = ambulances.reduce(
      (acc, a) => acc + a.history.filter((h) => h.date === t).length,
      0,
    );

    const openIssues = 0;
    return { totalFleet, fleetReadyPct, checksToday, openIssues };
  }, [ambulances]);

  const historyDates = useMemo(() => {
    if (!selected) return [];
    return Array.from(new Set(selected.history.map((h) => h.date))).sort(
      (a, b) => (a < b ? 1 : -1),
    );
  }, [selected]);

  const historyForSelectedDate = useMemo(() => {
    if (!selected) return { Day: [], Night: [] };
    const day = selected.history.filter(
      (h) => h.date === selectedHistoryDate && h.shift === "Day",
    );
    const night = selected.history.filter(
      (h) => h.date === selectedHistoryDate && h.shift === "Night",
    );
    return { Day: day, Night: night };
  }, [selected, selectedHistoryDate]);

  function formatDateOption(d) {
    const t = todayISO();
    if (d === t) return `Today (${d})`;
    return d;
  }

  const itemsSorted = useMemo(() => {
    if (!selected) return [];
    return [...selected.items].sort((a, b) => a.name.localeCompare(b.name));
  }, [selected]);

  const filteredAmbulances = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return ambulances.filter((a) => {
      const st = statusOf(a);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
      );
    });
  }, [ambulances, searchQuery, statusFilter]);

  function addAmbulance() {
    if (role !== "Admin") return;
    const name = newAmbName.trim();
    const code = newAmbCode.trim();

    setAmbulances((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1;

      const newAmb =
        name || code
          ? {
              id: nextId,
              name: name || `RESCUE-${nextId}`,
              code: code || `EMS-${2400 + nextId}`,
              lastChecked: "",
              history: [],
              items: DEFAULT_ITEMS.map((x) => ({ ...x })),
            }
          : makeAmbulance(nextId);

      return [...prev, newAmb];
    });

    setNewAmbName("");
    setNewAmbCode("");
    setShowAddAmbForm(false);
  }

  function removeItem(itemName) {
    if (!selected) return;
    setAmbulances((prev) =>
      prev.map((a) => {
        if (a.id !== selected.id) return a;
        return { ...a, items: a.items.filter((it) => it.name !== itemName) };
      }),
    );
  }

  function addNewItem() {
    if (!selected) return;
    const name = newItemName.trim();
    if (!name) return;

    const reqNum = Math.max(1, Number(newItemRequired) || 1);

    const exists = selected.items.some(
      (it) => it.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) return;

    setAmbulances((prev) =>
      prev.map((a) => {
        if (a.id !== selected.id) return a;
        return {
          ...a,
          items: [...a.items, { name, qty: 0, required: reqNum }],
        };
      }),
    );

    setNewItemName("");
    setNewItemRequired("1");
  }

  function beginEditRequired(itemName, currentRequired) {
    if (role !== "Admin") return;
    setEditingRequiredItem(itemName);
    setRequiredDraft(String(currentRequired));
  }

  function commitEditRequired(itemName) {
    if (!selected || role !== "Admin") return;
    const next = Math.max(1, Number(requiredDraft) || 1);

    setAmbulances((prev) =>
      prev.map((a) => {
        if (a.id !== selected.id) return a;
        const items = a.items.map((it) =>
          it.name === itemName ? { ...it, required: next } : it,
        );
        return { ...a, items };
      }),
    );

    setEditingRequiredItem(null);
    setRequiredDraft("");
    pushToast(`${itemName} required set to ${next}`, "success");
  }

  function cancelEditRequired() {
    setEditingRequiredItem(null);
    setRequiredDraft("");
  }

  return (
    <div className="home-page">
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
          <a className="nav-link active" href="#">
            Home
          </a>
          <a className="nav-link" href="#">
            About
          </a>
          <a className="nav-link" href="#">
            Contact
          </a>
        </div>

        <div className="nav-right">
          <div className="role">Logistics Admin</div>

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
                  className="add-ambulance-input"
                  placeholder="Name (optional)"
                  value={newAmbName}
                  onChange={(e) => setNewAmbName(e.target.value)}
                />
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
            placeholder="Search by name or code..."
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
                      <div className="fleet-name">{a.name}</div>
                      <div className="fleet-code">{a.code}</div>
                    </div>
                  </div>

                  <div className={`fleet-pill ${st}`}>
                    {st === "ready" && "✓ Ready"}
                    {st === "unchecked" && "◷ Not Checked"}
                  </div>
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
              <div className="modal-title">
                {selected.name} ({selected.code})
              </div>
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
                History
              </button>
            </div>

            <div className="modal-body">
              {activeTab === "info" && (
                <div className="info-wrap">
                  <div className="info-table">
                    <div className="info-row info-row-head">
                      <div className="info-col-name">Item</div>
                      <div className="info-col-qty">Quantity</div>
                      <div className="info-col-actions">Required</div>
                      <div className="info-col-remove"></div>
                    </div>

                    {itemsSorted.map((it) => {
                      const isEditing = editingRequiredItem === it.name;

                      return (
                        <div className="info-row" key={it.name}>
                          <div className="info-col-name">{it.name}</div>

                          <div className="info-col-qty">
                            {it.qty} / {it.required}
                          </div>

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
                                      commitEditRequired(it.name);
                                    if (e.key === "Escape")
                                      cancelEditRequired();
                                  }}
                                />

                                <button
                                  className="edit-confirm"
                                  type="button"
                                  onClick={() => commitEditRequired(it.name)}
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
                                  beginEditRequired(it.name, it.required)
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
                              onClick={() => removeItem(it.name)}
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
                    <input
                      className="add-item-dark-input"
                      placeholder="New item name..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />

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
                            historyForSelectedDate.Day.map((h, idx) => (
                              <div className="history-row" key={`d-${idx}`}>
                                <div className="history-by">{h.by}</div>
                                <div className="history-time">{h.time}</div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="history-col">
                          <div className="history-shift-title">Night Shift</div>
                          {historyForSelectedDate.Night.length === 0 ? (
                            <div className="history-empty">No checks</div>
                          ) : (
                            historyForSelectedDate.Night.map((h, idx) => (
                              <div className="history-row" key={`n-${idx}`}>
                                <div className="history-by">{h.by}</div>
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
