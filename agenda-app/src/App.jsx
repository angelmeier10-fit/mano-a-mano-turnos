import React, { useState, useEffect } from "react";
import { auth, watchAuthState, logout } from "./auth";
import LoginScreen from "./LoginScreen";
import Header from "./Header";
import { AgendaView } from "./AgendaComponents";
import { ClientesView, ServiciosView } from "./ClientesServiciosViews";
import NegocioView from "./NegocioView";
import GiftCardsView from "./GiftCardsView";
import {
  listenServices, addService, deleteService,
  listenAvailability, addAvailabilitySlot, removeAvailabilitySlot, addAvailabilitySlotsBatch, removeAvailabilitySlotsByIds,
  listenAppointments, createAppointment, updateAppointment, deleteAppointment,
  listenClients, upsertClientByName, updateClient, deleteClient,
  listenBusinessInfo, setBusinessInfo, freeAvailabilitySlot,
  listenGiftCards,
} from "../../shared/firestoreApi";
import { DEFAULT_SERVICES, DEFAULT_BUSINESS_INFO, GoogleFontsHref } from "../../shared/helpers";
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

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [view, setView] = useState("agenda");
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [businessInfo, setBusinessInfoState] = useState(DEFAULT_BUSINESS_INFO);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [giftCards, setGiftCards] = useState([]);

  useEffect(() => {
    const unsub = watchAuthState((u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  // Pedir permiso de notificaciones al loguear
  useEffect(() => {
    if (!user) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [user]);

  // Suscripciones en tiempo real a Firestore, solo cuando hay sesión iniciada
  useEffect(() => {
    if (!user) return;
    const unsubServices = listenServices(setServices);
    const knownIds = new Set();
    let firstLoad = true;
    const unsubAppts = listenAppointments((data) => {
      if (firstLoad) {
        data.forEach(a => knownIds.add(a.id));
        firstLoad = false;
      } else {
        data.forEach(a => {
          if (!knownIds.has(a.id) && a.status === "pendiente") {
            knownIds.add(a.id);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Nuevo turno solicitado", {
                body: `${a.clientName} · ${a.dateKey} ${a.start}`,
                icon: "/mano-a-mano-agenda/favicon.ico",
              });
            }
          } else {
            knownIds.add(a.id);
          }
        });
      }
      setAppointments(data);
    });
    const unsubClients = listenClients(setClients);
    const unsubAvail = listenAvailability(setAvailability);
    const unsubBiz = listenBusinessInfo((data) => {
      if (data) setBusinessInfoState(data);
      setDataLoaded(true);
    });
    const unsubGiftCards = listenGiftCards(setGiftCards);
    return () => {
      unsubServices(); unsubAppts(); unsubClients(); unsubAvail(); unsubBiz(); unsubGiftCards();
    };
  }, [user]);

  // Primera vez: si no hay servicios cargados en Firestore, precargamos los por defecto
  useEffect(() => {
    if (!user || !dataLoaded) return;
    if (services.length === 0) {
      DEFAULT_SERVICES.forEach(s => {
        const { id, ...rest } = s;
        addService(rest);
      });
    }
  }, [user, dataLoaded, services.length]);

  if (!authChecked) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingMark} />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <GoogleFontsLoader />
        <LoginScreen />
      </>
    );
  }

  return (
    <div style={styles.app}>
      <GoogleFontsLoader />
      <Header view={view} setView={setView} onLogout={logout} pendingGiftCards={giftCards.filter(g => g.status === "pending").length} />
      <main style={styles.main}>
        {view === "agenda" && (
          <AgendaView
            services={services}
            appointments={appointments}
            availability={availability}
            clients={clients}
            businessInfo={businessInfo}
            onCreateAppt={createAppointment}
            onUpdateAppt={updateAppointment}
            onDeleteAppt={deleteAppointment}
            onAddSlot={addAvailabilitySlot}
            onRemoveSlot={removeAvailabilitySlot}
            onCloseDay={removeAvailabilitySlotsByIds}
            onAddSlotsBatch={addAvailabilitySlotsBatch}
            onFreeSlot={freeAvailabilitySlot}
            upsertClientByName={upsertClientByName}
            pendingGiftCards={giftCards.filter(g => g.status === "pending").length}
            onGoGiftCards={() => setView("giftcards")}
          />
        )}
        {view === "clientes" && (
          <ClientesView
            clients={clients}
            appointments={appointments}
            services={services}
            onUpdateClient={updateClient}
            onDeleteClient={deleteClient}
          />
        )}
        {view === "servicios" && (
          <ServiciosView
            services={services}
            onAddService={addService}
            onDeleteService={deleteService}
          />
        )}
        {view === "negocio" && (
          <NegocioView
            businessInfo={businessInfo}
            onSave={setBusinessInfo}
            appointments={appointments}
            clients={clients}
            services={services}
          />
        )}
        {view === "giftcards" && (
          <GiftCardsView giftCards={giftCards} />
        )}
      </main>
    </div>
  );
}
