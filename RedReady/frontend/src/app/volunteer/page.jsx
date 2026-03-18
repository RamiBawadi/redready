"use client";

import { useMemo, useState } from "react";
import "./Volunteer.css";

const SHARED_ITEMS = [
  { id: "aed", name: "Defibrillator (AED)", requiredQty: 1 },
  { id: "first-aid", name: "First Aid Kit", requiredQty: 1 },
  { id: "oxygen", name: "Oxygen Cylinder", requiredQty: 100 },
  { id: "gloves", name: "Spare Gloves", requiredQty: 20 },
  { id: "stretcher", name: "Stretcher", requiredQty: 1 },
];

const CURRENT_VOLUNTEER = "Volunteer";

const AMBULANCE_CARDS = [
  {
    id: 1,
    title: "Ambulance 1",
    status: "Unchecked",
    lastChecked: "Not checked yet",
    items: SHARED_ITEMS,
  },
  {
    id: 2,
    title: "Ambulance 2",
    status: "Unchecked",
    lastChecked: "Not checked yet",
    items: SHARED_ITEMS,
  },
  {
    id: 3,
    title: "Ambulance 3",
    status: "Unchecked",
    lastChecked: "Not checked yet",
    items: SHARED_ITEMS,
  },
  {
    id: 4,
    title: "Ambulance 4",
    status: "Ready",
    lastChecked: "Today at 09:10",
    items: SHARED_ITEMS,
  },
  {
    id: 5,
    title: "Ambulance 5",
    status: "Partial",
    lastChecked: "Today at 08:25",
    issueCount: 2,
    items: SHARED_ITEMS,
  },
  {
    id: 6,
    title: "Ambulance 6",
    status: "Critical",
    lastChecked: "Yesterday at 22:40",
    issueCount: 4,
    items: SHARED_ITEMS,
  },
];

const STATUS_META = {
  Ready: {
    className: "ready",
    buttonLabel: "Checked",
    disabled: true,
  },
  Partial: {
    className: "partial",
    buttonLabel: "Recheck",
    disabled: false,
  },
  Critical: {
    className: "critical",
    buttonLabel: "Recheck",
    disabled: false,
  },
  Unchecked: {
    className: "unchecked",
    buttonLabel: "Check",
    disabled: false,
  },
};

export default function VolunteerPage() {
  const [activeModalId, setActiveModalId] = useState(null);
  const [itemStateByAmbulance, setItemStateByAmbulance] = useState({});

  const activeAmbulance = useMemo(
    () => AMBULANCE_CARDS.find((ambulance) => ambulance.id === activeModalId),
    [activeModalId],
  );

  const checkedCount = activeAmbulance
    ? activeAmbulance.items.filter(
        (item) => itemStateByAmbulance[activeAmbulance.id]?.[item.id]?.checked,
      ).length
    : 0;

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
    const ambulance = AMBULANCE_CARDS.find((entry) => entry.id === ambulanceId);
    setActiveModalId(ambulanceId);
    setItemStateByAmbulance((prev) => {
      if (!ambulance || prev[ambulanceId]) {
        return prev;
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

  function toggleItem(ambulanceId, itemId) {
    setItemStateByAmbulance((prev) => {
      const currentAmbulance = prev[ambulanceId] || {};
      return {
        ...prev,
        [ambulanceId]: {
          ...currentAmbulance,
          [itemId]: {
            ...currentAmbulance[itemId],
            checked: !currentAmbulance[itemId]?.checked,
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
              by: CURRENT_VOLUNTEER,
              at: formatSavedAt(),
            },
            noteDraft: noteText,
            isFlagOpen: false,
          },
        },
      };
    });
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
          <span className="volunteer-header__tab">Volunteer</span>
        </div>

        <div className="volunteer-header__right">
          <span className="volunteer-header__role">Volunteer</span>
          <a className="volunteer-header__exit" href="/login">
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
          {AMBULANCE_CARDS.map((ambulance) => {
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
                      <h2 className="ambulance-card__title">{ambulance.title}</h2>
                      <p className="ambulance-card__last-check">
                        Last time checked: {ambulance.lastChecked}
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
        <div
          className="volunteer-modal-backdrop"
          onClick={closeModal}
        >
          <div
            className="volunteer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="volunteer-modal__header">
              <h3 className="volunteer-modal__title">{activeAmbulance.title}</h3>
              <button
                type="button"
                className="volunteer-modal__close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="volunteer-modal__body">
              <div className="volunteer-modal__counter">
                {checkedCount} / {activeAmbulance.items.length} items checked
              </div>

              <div className="volunteer-modal__list">
                {activeAmbulance.items.map((item) => {
                  const itemState =
                    itemStateByAmbulance[activeAmbulance.id]?.[item.id];
                  const checked = itemState?.checked || false;
                  const hasQuantityControl = item.requiredQty > 1;

                  return (
                    <div
                      key={item.id}
                      className={`volunteer-modal__item ${checked ? "is-checked" : ""}`}
                    >
                      <label className="volunteer-modal__item-main">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(activeAmbulance.id, item.id)}
                        />
                        <span className="volunteer-modal__checkmark">✓</span>

                        <span className="volunteer-modal__item-text">
                          <span className="volunteer-modal__item-name">
                            {item.name}
                          </span>
                          <span className="volunteer-modal__item-qty">
                            Quantity required: {item.requiredQty}
                          </span>
                        </span>
                      </label>

                      {hasQuantityControl ? (
                        <div className="volunteer-modal__quantity-block">
                          <div className="volunteer-modal__quantity-label">
                            Available quantity
                          </div>

                          <div className="volunteer-modal__quantity-controls">
                            <input
                              className="volunteer-modal__slider"
                              type="range"
                              min="0"
                              max={item.requiredQty}
                              value={itemState?.quantity ?? item.requiredQty}
                              onChange={(event) =>
                                updateQuantity(
                                  activeAmbulance.id,
                                  item.id,
                                  event.target.value,
                                  item.requiredQty,
                                )
                              }
                            />

                            <input
                              className="volunteer-modal__quantity-input"
                              type="number"
                              min="0"
                              max={item.requiredQty}
                              value={itemState?.quantity ?? item.requiredQty}
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
                        <button
                          type="button"
                          className={`volunteer-modal__flag-button ${itemState?.savedNote ? "has-note" : ""}`}
                          onClick={() => toggleFlag(activeAmbulance.id, item.id)}
                        >
                          Flag
                        </button>

                        {itemState?.savedNote ? (
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
                        ) : null}
                      </div>

                      {itemState?.isFlagOpen ? (
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
                <button
                  type="button"
                  className="volunteer-modal__button volunteer-modal__button--primary"
                >
                  Complete Check
                </button>
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
