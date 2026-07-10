import React, { useState, useEffect } from "react";
import ReservarView from "./ReservarView";
import QuizView from "./QuizView";
import MiTurnoView from "./MiTurnoView";
import GiftCardView from "./GiftCardView";
import GiftCardRedeemView from "./GiftCardRedeemView";
import GiftCardLookupView from "./GiftCardLookupView";
import {
  listenServices,
  listenAvailability,
  bookSlotAtomic,
  createClientPublic,
  listenBusinessInfo,
  getMyBookingRefs,
  cancelAppointmentPublic,
  rescheduleAppointmentPublic,
} from "../../shared/firestoreApi";
import { DEFAULT_BUSINESS_INFO, GoogleFontsHref } from "../../shared/helpers";
import styles from "../../shared/styles";

function GoogleFontsLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = GoogleFontsHref();
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
}

function GiftCardMenuView({ onBuy, onLookup }) {
  return (
    <div style={{ padding: "32px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, margin: "0 0 8px", textAlign: "center" }}>Gift Cards</h2>
      <p style={{ fontSize: 13, color: "#8A8275", textAlign: "center", margin: "0 0 16px" }}>
        ¿Querés regalar una sesión o ya tenés una gift card?
      </p>
      <button
        style={{ background: "#B5654A", color: "#fff", border: "none", borderRadius: 12, padding: "18px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
        onClick={onBuy}
      >
        🎁 Regalar una sesión
        <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 4 }}>Comprá una gift card para alguien especial</div>
      </button>
      <button
        style={{ background: "#fff", color: "#2A2622", border: "2px solid #D0C5B4", borderRadius: 12, padding: "18px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
        onClick={onLookup}
      >
        Buscar mi gift card
        <div style={{ fontSize: 12, fontWeight: 400, color: "#8A8275", marginTop: 4 }}>Buscá por número de teléfono</div>
      </button>
    </div>
  );
}

function getGiftCardCodeFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("giftcard") || null;
  } catch {
    return null;
  }
}

export default function App() {
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [businessInfo, setBusinessInfo] = useState(DEFAULT_BUSINESS_INFO);
  const [loaded, setLoaded] = useState(false);
  const [currentView, setCurrentView] = useState("reservar");
  const [giftCardSubview, setGiftCardSubview] = useState("menu"); // "menu" | "buy" | "lookup" | "redeem"
  const [lookupSelectedCode, setLookupSelectedCode] = useState(null);
  const [miturnoInitPhone, setMiturnoInitPhone] = useState("");
  const [quizPreselectedServiceId, setQuizPreselectedServiceId] = useState(null);

  // Si la URL tiene ?giftcard=CODE, mostramos la vista de canje directamente
  const giftCardCode = getGiftCardCodeFromURL();

  useEffect(() => {
    const unsubServices = listenServices(setServices);
    const unsubAvail = listenAvailability((data) => { setAvailability(data); setLoaded(true); });
    const unsubBiz = listenBusinessInfo((data) => { if (data) setBusinessInfo(data); });
    return () => { unsubServices(); unsubAvail(); unsubBiz(); };
  }, []);

  if (!loaded) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingMark} />
      </div>
    );
  }

  // Vista de canje de gift card (sin tabs, pantalla completa)
  if (giftCardCode) {
    return (
      <div style={styles.app}>
        <GoogleFontsLoader />
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.logoMark}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M4 14C4 8 8.5 4 14 4C19.5 4 24 8 24 14" stroke="#B5654A" strokeWidth="2.4" strokeLinecap="round"/>
                <path d="M7 14C7 10 10 7.5 14 7.5C18 7.5 21 10 21 14" stroke="#EFE9DF" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
                <circle cx="14" cy="19" r="2.6" fill="#B5654A"/>
              </svg>
            </div>
            <h1 style={styles.brandName}>{businessInfo?.name || "Angel Meier Turnos"}</h1>
          </div>
        </header>
        <main style={styles.main}>
          <GiftCardRedeemView
            code={giftCardCode}
            services={services}
            availability={availability}
            businessInfo={businessInfo}
            onBookSlot={bookSlotAtomic}
            onUpsertClient={createClientPublic}
          />
        </main>
      </div>
    );
  }

  function navigateToMiTurno(phone = "") {
    setMiturnoInitPhone(phone);
    setCurrentView("miturno");
  }

  function navigateToReservarConServicio(serviceId) {
    setQuizPreselectedServiceId(serviceId);
    setCurrentView("reservar");
  }

  return (
    <div style={styles.app}>
      <GoogleFontsLoader />
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.logoMark}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 14C4 8 8.5 4 14 4C19.5 4 24 8 24 14" stroke="#B5654A" strokeWidth="2.4" strokeLinecap="round"/>
              <path d="M7 14C7 10 10 7.5 14 7.5C18 7.5 21 10 21 14" stroke="#EFE9DF" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
              <circle cx="14" cy="19" r="2.6" fill="#B5654A"/>
            </svg>
          </div>
          <h1 style={styles.brandName}>{businessInfo?.name || "Angel Meier Turnos"}</h1>
        </div>
        <nav style={styles.tabBar}>
          <button
            style={{ ...styles.tabBtn, ...(currentView === "reservar" ? styles.tabBtnActive : {}) }}
            onClick={() => setCurrentView("reservar")}
          >
            Reservar
          </button>
          <button
            style={{ ...styles.tabBtn, fontWeight: 700, ...(currentView === "quiz" ? styles.tabBtnActive : {}) }}
            onClick={() => setCurrentView("quiz")}
          >
            🧭 ¿Qué masaje elijo?
          </button>
          <button
            style={{ ...styles.tabBtn, ...(currentView === "giftcard" ? styles.tabBtnActive : {}) }}
            onClick={() => { setCurrentView("giftcard"); setGiftCardSubview("menu"); }}
          >
            Regalar 🎁
          </button>
          <button
            style={{ ...styles.tabBtn, ...(currentView === "miturno" ? styles.tabBtnActive : {}) }}
            onClick={() => navigateToMiTurno()}
          >
            Mis turnos
          </button>
        </nav>
      </header>
      <main style={styles.main}>
        {currentView === "reservar" && (
          <ReservarView
            services={services}
            availability={availability}
            businessInfo={businessInfo}
            onBookSlot={bookSlotAtomic}
            onUpsertClient={createClientPublic}
            onNavigateToMiTurno={navigateToMiTurno}
            onGoGiftCard={() => setCurrentView("giftcard")}
            initialServiceId={quizPreselectedServiceId}
          />
        )}
        {currentView === "quiz" && (
          <QuizView services={services} onReservar={navigateToReservarConServicio} />
        )}
        {currentView === "giftcard" && giftCardSubview === "menu" && (
          <GiftCardMenuView
            onBuy={() => setGiftCardSubview("buy")}
            onLookup={() => setGiftCardSubview("lookup")}
          />
        )}
        {currentView === "giftcard" && giftCardSubview === "buy" && (
          <GiftCardView
            services={services}
            businessInfo={businessInfo}
            onBack={() => setGiftCardSubview("menu")}
          />
        )}
        {currentView === "giftcard" && giftCardSubview === "lookup" && (
          <GiftCardLookupView
            onSelectGiftCard={(code) => { setLookupSelectedCode(code); setGiftCardSubview("redeem"); }}
            onBack={() => setGiftCardSubview("menu")}
          />
        )}
        {currentView === "giftcard" && giftCardSubview === "redeem" && lookupSelectedCode && (
          <GiftCardRedeemView
            code={lookupSelectedCode}
            services={services}
            availability={availability}
            businessInfo={businessInfo}
            onBookSlot={bookSlotAtomic}
            onUpsertClient={createClientPublic}
          />
        )}
        {currentView === "miturno" && (
          <MiTurnoView
            services={services}
            availability={availability}
            businessInfo={businessInfo}
            onGetMyBookings={getMyBookingRefs}
            onCancelAppointment={cancelAppointmentPublic}
            onReschedule={rescheduleAppointmentPublic}
            initialPhone={miturnoInitPhone}
          />
        )}
      </main>
    </div>
  );
}
