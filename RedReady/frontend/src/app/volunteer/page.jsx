"use client";

import { useMemo, useState, useEffect } from "react";
import "./Volunteer.css";
import { apiUrl } from "@/lib/api";

const STATUS_META = {
  Ready: { className: "ready", buttonLabel: "View Check", disabled: false },
  Partial: { className: "partial", buttonLabel: "View Check", disabled: false },
  Critical: {
    className: "critical",
    buttonLabel: "View Check",
    disabled: false,
  },
  Unchecked: { className: "unchecked", buttonLabel: "Check", disabled: false },
};

function handleLogout(e) {
  e.preventDefault();
  localStorage.clear();
  window.location.href = "/login";
}

function getShift() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 5 && hour < 17) return "Day";
  return "Night";
}

function getShiftDayName() {
  const now = new Date();
  const hour = now.getHours();

  // If between midnight and 5 AM → go back one day
  if (hour < 5) {
    now.setDate(now.getDate() - 1);
  }

  return now.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return "";

  const [date, time] = dateTimeString.split(" ");

  if (!time) return dateTimeString;

  return `${date} ${time.slice(0, 5)}`; // keep HH:MM
}

function getDayFromDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function formatTime(timeString) {
  if (!timeString) return "";

  return timeString.slice(0, 5);
}

import AuthGuard from "@/components/AuthGuard";
export default function VolunteerPageWrapper() {
  return (
    <AuthGuard>
      <VolunteerPage />
    </AuthGuard>
  );
}

function VolunteerPage() {
  const [ambulances, setAmbulances] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) return;

    fetch(apiUrl("/api/me/"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setUser(data));
  }, []);

  const fullName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : "Unknown User";

  const shift = getShift();
  const dayName = getShiftDayName();
  useEffect(() => {
    const token = localStorage.getItem("access");

    fetch(apiUrl("/api/ambulances/"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("API:", data);
        setAmbulances(data);
      })
      .catch((err) => console.error(err));
  }, []);

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const ambulanceCards = useMemo(() => {
    return ambulances.map((a) => ({
      id: a.id,
      title: `Ambulance ${a.code}`,
      status: capitalize(a.status),
      lastChecked: a.last_checked || "Not checked yet",
      last_check: a.last_check,
      items: a.last_check
        ? a.last_check.items.map((t) => ({
            id: t.item_id,
            name: t.item,
            requiredQty: t.required,
            quantity: t.quantity,
            is_flagged: t.flagged,
            note: t.note,
            is_checked: t.is_checked,
          }))
        : (a.templates || []).map((t) => ({
            id: t.item,
            name: t.item_name,
            requiredQty: t.required_quantity,
          })),
    }));
  }, [ambulances]);

  const [activeModalId, setActiveModalId] = useState(null);
  const [itemStateByAmbulance, setItemStateByAmbulance] = useState({});

  const activeAmbulance = useMemo(
    () => ambulanceCards.find((ambulance) => ambulance.id === activeModalId),
    [activeModalId, ambulanceCards],
  );

  const checkedCount = activeAmbulance
    ? activeAmbulance.items.filter(
        (item) => itemStateByAmbulance[activeAmbulance.id]?.[item.id]?.checked,
      ).length
    : 0;

  const isViewMode = !!activeAmbulance?.last_check;

  function makeInitialItemState(ambulance) {
    return ambulance.items.reduce((acc, item) => {
      acc[item.id] = {
        checked: false,
        quantity: item.requiredQty,
        isFlagOpen: false,
        noteDraft: "",
        savedNote: null,
      };
      return acc;
    }, {});
  }

  function formatSavedAt() {
    return new Date().toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  function openModal(ambulanceId) {
    const ambulance = ambulanceCards.find((entry) => entry.id === ambulanceId);
    setActiveModalId(ambulanceId);

    setItemStateByAmbulance((prev) => {
      if (!ambulance) return prev;

      if (ambulance.last_check) {
        const state = {};

        ambulance.items.forEach((item) => {
          state[item.id] = {
            checked: item.is_checked,
            quantity: item.quantity,
            isFlagOpen: false,
            noteDraft: item.note || "",
            savedNote: item.note
              ? {
                  text: item.note,
                  by: ambulance.last_check.user_full_name,
                  at: `${ambulance.last_check.date} ${ambulance.last_check.time}`,
                }
              : null,
          };
        });

        return {
          ...prev,
          [ambulanceId]: state,
        };
      }

      return {
        ...prev,
        [ambulanceId]: makeInitialItemState(ambulance),
      };
    });
  }

  function closeModal() {
    setActiveModalId(null);
  }

  function toggleItem(ambulanceId, itemId, requiredQty = 0) {
    setItemStateByAmbulance((prev) => {
      const currentAmbulance = prev[ambulanceId] || {};

      const currentItem = currentAmbulance[itemId] || {
        checked: false,
        quantity: 0,
      };

      const newChecked = !currentItem.checked;

      return {
        ...prev,
        [ambulanceId]: {
          ...currentAmbulance,
          [itemId]: {
            ...currentItem,
            checked: newChecked,
            quantity: newChecked ? requiredQty : 0, // 🔥 KEY
          },
        },
      };
    });
  }

  function updateQuantity(ambulanceId, itemId, nextValue, maxValue) {
    const parsedValue = Number(nextValue);
    const safeValue = Number.isNaN(parsedValue)
      ? 0
      : Math.max(0, Math.min(maxValue, parsedValue));

    setItemStateByAmbulance((prev) => {
      const currentAmbulance = prev[ambulanceId] || {};
      return {
        ...prev,
        [ambulanceId]: {
          ...currentAmbulance,
          [itemId]: {
            ...currentAmbulance[itemId],
            quantity: safeValue,
          },
        },
      };
    });
  }

  function toggleFlag(ambulanceId, itemId) {
    setItemStateByAmbulance((prev) => {
      const currentAmbulance = prev[ambulanceId] || {};
      return {
        ...prev,
        [ambulanceId]: {
          ...currentAmbulance,
          [itemId]: {
            ...currentAmbulance[itemId],
            isFlagOpen: !currentAmbulance[itemId]?.isFlagOpen,
          },
        },
      };
    });
  }

  function updateNoteDraft(ambulanceId, itemId, value) {
    setItemStateByAmbulance((prev) => {
      const currentAmbulance = prev[ambulanceId] || {};
      return {
        ...prev,
        [ambulanceId]: {
          ...currentAmbulance,
          [itemId]: {
            ...currentAmbulance[itemId],
            noteDraft: value,
          },
        },
      };
    });
  }

  function saveFlagNote(ambulanceId, itemId) {
    setItemStateByAmbulance((prev) => {
      const currentAmbulance = prev[ambulanceId] || {};
      const currentItem = currentAmbulance[itemId];
      const noteText = (currentItem?.noteDraft || "").trim();

      if (!noteText) {
        return prev;
      }

      return {
        ...prev,
        [ambulanceId]: {
          ...currentAmbulance,
          [itemId]: {
            ...currentItem,
            savedNote: {
              text: noteText,
              by: localStorage.getItem("user_email") || "You",
              at: formatSavedAt(),
            },
            noteDraft: noteText,
            isFlagOpen: false,
          },
        },
      };
    });
  }

  function handleCompleteCheck() {
    if (!activeAmbulance) return;

    const token = localStorage.getItem("access");

    const items = activeAmbulance.items.map((item) => {
      const state = itemStateByAmbulance[activeAmbulance.id]?.[item.id] || {};

      return {
        item: item.id,
        available_quantity: state.checked ? state.quantity : 0,
        is_flagged: !!state.savedNote,
        note: state.savedNote?.text || "",
        is_checked: state.checked || false, // ✅ THIS FIXES EVERYTHING
      };
    });

    fetch(apiUrl("/api/checks/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ambulance: activeAmbulance.id,
        items,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Saved:", data);
        alert("Check saved successfully ✅");
        closeModal();
        window.location.reload();
      })
      .catch((err) => console.error(err));
  }

  function deleteFlagNote(ambulanceId, itemId) {
    setItemStateByAmbulance((prev) => {
      const currentAmbulance = prev[ambulanceId] || {};
      const currentItem = currentAmbulance[itemId];

      return {
        ...prev,
        [ambulanceId]: {
          ...currentAmbulance,
          [itemId]: {
            ...currentItem,
            savedNote: null,
            noteDraft: "",
            isFlagOpen: false,
          },
        },
      };
    });
  }

  return (
    <div className="volunteer-page">
      <header className="volunteer-header">
        <div className="volunteer-header__left">
          <img
            className="volunteer-header__logo"
            src="/assets/logo-white-cropped.png"
            alt="RedReady"
          />
          <span className="volunteer-header__brand-name">RedReady</span>
        </div>

        <div className="volunteer-header__center">
          <div className="volunteer-header__tab">{fullName}</div>
          <div className="volunteer-header__shift">
            {shift} Shift • {dayName}
          </div>
        </div>

        <div className="volunteer-header__right">
          <span className="volunteer-header__role">Volunteer</span>
          <a className="volunteer-header__exit" href="#" onClick={handleLogout}>
            Logout
          </a>
          <div className="volunteer-header__avatar" />
        </div>
      </header>

      <main className="volunteer-content">
        <div className="fleet-status-head">
          <h1 className="fleet-status-title">Fleet Status</h1>
          <p className="fleet-status-subtitle">
            Select an ambulance below to check or recheck its readiness.
          </p>
        </div>

        <section className="ambulance-grid" aria-label="Volunteer ambulances">
          {ambulanceCards.map((ambulance) => {
            const meta = STATUS_META[ambulance.status];

            return (
              <article
                key={ambulance.id}
                className={`ambulance-card ambulance-card--${meta.className}`}
              >
                <div className="ambulance-card__icon-wrap">
                  <img
                    className="ambulance-card__icon"
                    src="/assets/ambulance-icon.png"
                    alt=""
                  />
                </div>

                <div className="ambulance-card__body">
                  <div className="ambulance-card__top">
                    <div>
                      <h2 className="ambulance-card__title">
                        {ambulance.title}
                      </h2>
                      <p className="ambulance-card__last-check">
                        {ambulance.last_check ? (
                          <>
                            Checked this shift at:{" "}
                            {formatTime(ambulance.last_check.time)}
                          </>
                        ) : (
                          <>Not checked this shift</>
                        )}
                      </p>
                      {ambulance.status === "Partial" ||
                      ambulance.status === "Critical" ? (
                        <p
                          className={`ambulance-card__issues ambulance-card__issues--${meta.className}`}
                        >
                          {ambulance.issueCount} issues found
                        </p>
                      ) : null}
                    </div>

                    <span
                      className={`ambulance-card__badge ambulance-card__badge--${meta.className}`}
                    >
                      {ambulance.status}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`ambulance-card__button ambulance-card__button--${meta.className}`}
                    disabled={meta.disabled}
                    onClick={() => {
                      if (!meta.disabled) {
                        openModal(ambulance.id);
                      }
                    }}
                  >
                    {meta.buttonLabel}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {activeAmbulance ? (
        <div className="volunteer-modal-backdrop" onClick={closeModal}>
          <div
            className="volunteer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="volunteer-modal__header">
              <div className="volunteer-modal__header-left">
                <div className="volunteer-modal__title">
                  {activeAmbulance.title}
                </div>

                {isViewMode && activeAmbulance.last_check && (
                  <div className="volunteer-modal__meta">
                    <div>By : {activeAmbulance.last_check.user_full_name}</div>
                    <div>
                      At : {activeAmbulance.last_check.date} •{" "}
                      {formatTime(activeAmbulance.last_check.time)}
                    </div>
                    <div>
                      {activeAmbulance.last_check.shift === "night"
                        ? "Night"
                        : "Day"}{" "}
                      Shift • {getDayFromDate(activeAmbulance.last_check.date)}
                    </div>
                  </div>
                )}
              </div>

              <div className="volunteer-modal__header-right">
                <span
                  className={`volunteer-modal__status-badge volunteer-modal__status-${activeAmbulance.status.toLowerCase()}`}
                >
                  {activeAmbulance.status}
                </span>
              </div>
            </div>

            <div className="volunteer-modal__body">
              <div className="volunteer-modal__counter">
                {checkedCount} / {activeAmbulance.items.length} items checked
              </div>

              <div className="volunteer-modal__list">
                {activeAmbulance.items.map((item) => {
                  const itemState = itemStateByAmbulance[activeAmbulance.id]?.[
                    item.id
                  ] || {
                    checked: false,
                    quantity: item.requiredQty,
                    isFlagOpen: false,
                    noteDraft: "",
                    savedNote: null,
                  };
                  const checked = itemState?.checked || false;
                  const hasQuantityControl = item.requiredQty > 1;
                  const available = itemState?.checked ? itemState.quantity : 0;
                  const isMissing = available < item.requiredQty;
                  const hasFlag = !!itemState?.savedNote;

                  return (
                    <div
                      key={item.id}
                      className={`volunteer-modal__item ${checked ? "is-checked" : ""} ${hasFlag ? "volunteer-modal__item-flagged" : isMissing ? "volunteer-modal__item-missing" : ""}`}
                    >
                      <label className="volunteer-modal__item-main">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isViewMode}
                          onChange={() =>
                            toggleItem(
                              activeAmbulance.id,
                              item.id,
                              item.requiredQty,
                            )
                          }
                        />
                        <span
                          className={`volunteer-modal__checkmark ${hasFlag ? "volunteer-modal__checkmark-flagged" : isMissing ? "volunteer-modal__checkmark-missing" : "volunteer-modal__checkmark-green"}`}
                        >
                          ✓
                        </span>

                        <span className="volunteer-modal__item-text">
                          <span className={`volunteer-modal__item-name `}>
                            {item.name}
                          </span>
                          <div
                            className={`volunteer-modal__item-qty  ${
                              itemState?.checked && available < item.requiredQty
                                ? "volunteer-modal__item-qty-missing"
                                : ""
                            }`}
                          >
                            {itemState?.checked ? (
                              <>
                                {available < item.requiredQty
                                  ? "Missing Item - "
                                  : ""}
                                Available: {available} / Required:{" "}
                                {item.requiredQty}
                              </>
                            ) : (
                              <>
                                <>Available: 0 / Required: {item.requiredQty}</>
                              </>
                            )}
                          </div>
                        </span>
                      </label>

                      {hasQuantityControl && itemState?.checked ? (
                        <div className="volunteer-modal__quantity-block">
                          <div className="volunteer-modal__quantity-label">
                            Available quantity
                          </div>

                          <div className="volunteer-modal__quantity-controls">
                            {itemState?.checked && (
                              <input
                                className="volunteer-modal__slider"
                                type="range"
                                min="0"
                                max={item.requiredQty}
                                value={itemState?.quantity ?? 0}
                                disabled={isViewMode}
                                onChange={(e) =>
                                  updateQuantity(
                                    activeAmbulance.id,
                                    item.id,
                                    e.target.value,
                                    item.requiredQty,
                                  )
                                }
                              />
                            )}

                            <input
                              className="volunteer-modal__quantity-input"
                              type="number"
                              min="0"
                              max={item.requiredQty}
                              value={itemState?.quantity ?? item.requiredQty}
                              disabled={isViewMode}
                              onChange={(event) =>
                                updateQuantity(
                                  activeAmbulance.id,
                                  item.id,
                                  event.target.value,
                                  item.requiredQty,
                                )
                              }
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="volunteer-modal__flag-row">
                        {/* 🟢 CHECK MODE → show flag button */}
                        {!isViewMode && (
                          <button
                            type="button"
                            className="volunteer-modal__flag-button"
                            onClick={() =>
                              toggleFlag(activeAmbulance.id, item.id)
                            }
                          >
                            Flag
                          </button>
                        )}

                        {isViewMode && itemState?.savedNote && (
                          <div className="volunteer-modal__saved-note">
                            <div className="volunteer-modal__saved-note-text">
                              {itemState.savedNote.text}
                            </div>
                            <div className="volunteer-modal__saved-note-meta">
                              Placed by {itemState.savedNote.by} on{" "}
                              {formatDateTime(itemState.savedNote.at)}
                            </div>
                          </div>
                        )}

                        {!isViewMode && itemState?.savedNote && (
                          <div className="volunteer-modal__saved-note">
                            <div className="volunteer-modal__saved-note-text">
                              Saved note: {itemState.savedNote.text}
                            </div>
                            <div className="volunteer-modal__saved-note-meta">
                              Placed by {itemState.savedNote.by} on{" "}
                              {itemState.savedNote.at}
                            </div>

                            <button
                              type="button"
                              className="volunteer-modal__delete-note"
                              onClick={() =>
                                deleteFlagNote(activeAmbulance.id, item.id)
                              }
                            >
                              Delete flag note
                            </button>
                          </div>
                        )}
                      </div>

                      {itemState?.isFlagOpen && !isViewMode ? (
                        <div className="volunteer-modal__note-box">
                          <textarea
                            className="volunteer-modal__note-input"
                            placeholder="Write your note here..."
                            value={itemState?.noteDraft || ""}
                            onChange={(event) =>
                              updateNoteDraft(
                                activeAmbulance.id,
                                item.id,
                                event.target.value,
                              )
                            }
                          />
                          <button
                            type="button"
                            className="volunteer-modal__save-note"
                            onClick={() =>
                              saveFlagNote(activeAmbulance.id, item.id)
                            }
                          >
                            Save
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="volunteer-modal__actions">
                {!isViewMode && (
                  <button
                    type="button"
                    className="volunteer-modal__button volunteer-modal__button--primary"
                    onClick={handleCompleteCheck}
                  >
                    Complete Check
                  </button>
                )}

                <button
                  type="button"
                  className="volunteer-modal__button volunteer-modal__button--secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
