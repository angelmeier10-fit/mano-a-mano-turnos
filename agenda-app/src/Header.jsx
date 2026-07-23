import React, { useState, useEffect, useRef } from "react";
import { Calendar, Users, Settings, Sliders, LogOut, Gift, Bell, Package } from "lucide-react";
import styles from "../../shared/styles";
import { formatDateShort } from "../../shared/helpers";

const SEEN_KEY = "notif_seen_ids";

function getSeenIds() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; }
}
function addSeenId(id) {
  const seen = getSeenIds();
  if (!seen.includes(id)) localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]));
}

export default function Header({ view, setView, onLogout, pendingGiftCards = 0, pendingCombos = 0, pendingApptsList = [], onOpenAppt }) {
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState(getSeenIds);
  const bellRef = useRef(null);

  // Limpiar seenIds que ya no son pendientes (fueron confirmados/cancelados)
  const pendingIds = pendingApptsList.map(a => a.id);
  const unseenCount = pendingApptsList.filter(a => !seenIds.includes(a.id)).length;

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleNotifClick(appt) {
    addSeenId(appt.id);
    setSeenIds(getSeenIds());
    setOpen(false);
    onOpenAppt?.(appt.id);
  }

  const tabs = [
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "giftcards", label: "Gift Cards", icon: Gift, badge: pendingGiftCards },
    { id: "combos", label: "Combos", icon: Package, badge: pendingCombos },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "servicios", label: "Servicios", icon: Settings },
    { id: "negocio", label: "Negocio", icon: Sliders },
  ];

  return (
    <header style={styles.header}>
      <div style={styles.headerTop}>
        <div style={styles.logoMark}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M4 14C4 8 8.5 4 14 4C19.5 4 24 8 24 14" stroke="#B5654A" strokeWidth="2.4" strokeLinecap="round"/>
            <path d="M7 14C7 10 10 7.5 14 7.5C18 7.5 21 10 21 14" stroke="#EFE9DF" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
            <circle cx="14" cy="19" r="2.6" fill="#B5654A"/>
          </svg>
        </div>
        <h1 style={styles.brandName}>Mano&nbsp;a&nbsp;Mano</h1>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          {/* Bell de notificaciones */}
          <div ref={bellRef} style={{ position: "relative" }}>
            <button
              onClick={() => setOpen(v => !v)}
              style={{ background: "none", border: "none", color: unseenCount > 0 ? "#C9973A" : "#9A9183", cursor: "pointer", display: "flex", padding: 6, position: "relative" }}
              title="Notificaciones"
            >
              <Bell size={18} />
              {unseenCount > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, background: "#C9973A", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {unseenCount}
                </span>
              )}
            </button>

            {open && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: "#2A2622", border: "1px solid #3D372F", borderRadius: 10,
                minWidth: 260, maxWidth: 320, zIndex: 200,
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                overflow: "hidden",
              }}>
                <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #3D372F", fontSize: 12, fontWeight: 600, color: "#9A9183", letterSpacing: "0.04em" }}>
                  TURNOS PENDIENTES
                </div>
                {pendingApptsList.length === 0 ? (
                  <div style={{ padding: "14px 14px", fontSize: 13, color: "#6B6259" }}>Sin turnos pendientes</div>
                ) : (
                  pendingApptsList.map(appt => {
                    const unseen = !seenIds.includes(appt.id);
                    return (
                      <button
                        key={appt.id}
                        onClick={() => handleNotifClick(appt)}
                        style={{
                          display: "flex", flexDirection: "column", gap: 2,
                          width: "100%", textAlign: "left", padding: "11px 14px",
                          background: unseen ? "rgba(201,151,58,0.12)" : "none",
                          border: "none", borderBottom: "1px solid #3D372F",
                          cursor: "pointer", color: unseen ? "#E8C97A" : "#9A9183",
                        }}
                      >
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: unseen ? "#E8C97A" : "#BFB8AE" }}>
                          {appt.clientName}
                        </span>
                        <span style={{ fontSize: 12 }}>
                          {formatDateShort(appt.dateKey)} · {appt.start} hs
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            style={{ background: "none", border: "none", color: "#9A9183", cursor: "pointer", display: "flex", padding: 6 }}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <nav style={styles.tabBar}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{ ...styles.tabBtn, ...(active ? styles.tabBtnActive : {}) }}
            >
              <div style={{ position: "relative", display: "inline-flex" }}>
                <Icon size={16} strokeWidth={2.2} />
                {t.badge > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -6, background: "#C9973A", color: "#fff", borderRadius: "50%", width: 13, height: 13, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {t.badge}
                  </span>
                )}
              </div>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
