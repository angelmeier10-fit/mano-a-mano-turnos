import React from "react";
import { Calendar, Users, Settings, Sliders, LogOut, Gift } from "lucide-react";
import styles from "../../shared/styles";

export default function Header({ view, setView, onLogout, pendingGiftCards = 0 }) {
  const tabs = [
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "giftcards", label: "Gift Cards", icon: Gift, badge: pendingGiftCards },
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
        <button
          onClick={onLogout}
          style={{ marginLeft: "auto", background: "none", border: "none", color: "#9A9183", cursor: "pointer", display: "flex", padding: 6 }}
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
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
