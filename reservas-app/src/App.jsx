import React, { useState, useEffect } from "react";
import ReservarView from "./ReservarView";
import MiTurnoView from "./MiTurnoView";
import GiftCardView from "./GiftCardView";
import GiftCardRedeemView from "./GiftCardRedeemView";
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
  const [miturnoInitPhone, setMiturnoInitPhone] = useState("");

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
            <h1 style={styles.brandName}>{businessInfo?.name || "Mano a Mano"}</h1>
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
          <h1 style={styles.brandName}>{businessInfo?.name || "Mano a Mano"}</h1>
        </div>
        <nav style={styles.tabBar}>
          <button
            style={{ ...styles.tabBtn, ...(currentView === "reservar" ? styles.tabBtnActive : {}) }}
            onClick={() => setCurrentView("reservar")}
          >
            Reservar
          </button>
          <button
            style={{ ...styles.tabBtn, ...(currentView === "giftcard" ? styles.tabBtnActive : {}) }}
            onClick={() => setCurrentView("giftcard")}
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
          />
        )}
        {currentView === "giftcard" && (
          <GiftCardView
            services={services}
            businessInfo={businessInfo}
            onBack={() => setCurrentView("reservar")}
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
