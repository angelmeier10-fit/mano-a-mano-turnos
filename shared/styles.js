// shared/styles.js

const styles = {
  app: {
    fontFamily: "'Inter', sans-serif",
    background: "#EFE9DF",
    minHeight: "100vh",
    color: "#2A2622",
    display: "flex",
    flexDirection: "column",
  },
  loadingScreen: {
    minHeight: "100vh",
    background: "#2A2622",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingMark: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid #4A453D", borderTopColor: "#B5654A",
    animation: "spin 0.8s linear infinite",
  },
  header: {
    background: "#2A2622",
    position: "sticky", top: 0, zIndex: 10,
    paddingBottom: 0,
  },
  headerTop: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "18px 18px 14px",
  },
  logoMark: { display: "flex" },
  brandName: {
    fontFamily: "'Fraunces', serif", fontWeight: 600,
    fontSize: 21, color: "#EFE9DF", letterSpacing: "-0.01em", margin: 0,
  },
  tabBar: {
    display: "flex", gap: 2, padding: "0 10px",
    borderBottom: "1px solid #3D372F",
  },
  tabBtn: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "9px 4px 11px", background: "none", border: "none",
    color: "#9A9183", fontSize: 11.5, fontFamily: "'Inter', sans-serif", fontWeight: 500,
    cursor: "pointer", borderBottom: "2.5px solid transparent",
  },
  tabBtnActive: {
    color: "#EFE9DF", borderBottomColor: "#B5654A",
  },
  main: { flex: 1, paddingBottom: 40 },
  viewWrap: { padding: "18px 16px", maxWidth: 720, margin: "0 auto" },

  sectionTitle: {
    fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600,
    margin: "0 0 16px", color: "#2A2622",
  },

  todayCard: {
    background: "#2A2622", borderRadius: 14, padding: "14px 16px", marginBottom: 14,
  },
  todayCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  todayCardTitle: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#EFE9DF" },
  todayCardCount: { fontSize: 11.5, color: "#B5A98F", fontWeight: 600 },
  todayList: { display: "flex", flexDirection: "column", gap: 2 },
  todayRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "7px 4px",
    background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left",
  },
  todayTime: { fontSize: 13, fontWeight: 700, color: "#EFE9DF", minWidth: 42 },
  todayName: { fontSize: 13.5, color: "#D8D0C0", flex: 1 },

  reminderCard: {
    background: "#F5EFE3", border: "1px solid #E3D9C2", borderRadius: 14,
    padding: "14px 16px", marginBottom: 14,
  },
  reminderRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "6px 4px",
  },
  reminderTime: { fontSize: 13, fontWeight: 700, color: "#2A2622", minWidth: 42 },
  reminderName: { fontSize: 13.5, color: "#4A4337", flex: 1 },
  reminderWaBtn: {
    display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
    color: "#fff", background: "#3DA854", padding: "5px 9px", borderRadius: 16,
    textDecoration: "none", flexShrink: 0,
  },
  reminderNoPhone: { fontSize: 11, color: "#B0A78F", flexShrink: 0 },

  statsCard: {
    background: "#fff", borderRadius: 14, border: "1px solid #E3DBCB",
    padding: "13px 16px", marginBottom: 16,
  },
  statsRow: { display: "flex", alignItems: "center", gap: 10 },
  statsValue: { fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, color: "#2A2622" },
  statsLabel: { fontSize: 11.5, color: "#8A8275", marginTop: 1 },
  statsSubRow: { fontSize: 12, color: "#6E6555", marginTop: 8, paddingTop: 8, borderTop: "1px solid #F0EBE0" },
  statsSubRowWarn: { fontSize: 12, color: "#A6483A", marginTop: 6, fontWeight: 600 },

  recurringBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    width: "100%", padding: "11px", borderRadius: 12, border: "1.5px dashed #C9BFA8",
    background: "#fff", color: "#6E6555", fontWeight: 600, fontSize: 13, cursor: "pointer",
    marginBottom: 14, fontFamily: "'Inter', sans-serif",
  },
  weekdayPicker: { display: "flex", gap: 6, flexWrap: "wrap" },
  weekdayChip: {
    width: 42, height: 38, borderRadius: 10, border: "1.5px solid #DCD4C4",
    background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#2A2622", cursor: "pointer",
  },
  weekdayChipActive: { background: "#2A2622", borderColor: "#2A2622", color: "#EFE9DF" },
  recurringPreview: {
    fontSize: 12.5, color: "#4A5A40", background: "#F2F5EF", border: "1px solid #D7E3CE",
    borderRadius: 10, padding: "10px 12px", marginTop: 14,
  },

  weekNav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 10, border: "1px solid #DCD4C4",
    background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#2A2622",
  },
  weekLabel: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600 },
  todayBtn: {
    fontSize: 11.5, color: "#B5654A", background: "none", border: "none",
    cursor: "pointer", fontWeight: 600, padding: "2px 0",
  },

  weekGrid: {
    display: "grid", gridTemplateColumns: "1fr", gap: 10,
  },
  dayCol: {
    background: "#fff", borderRadius: 14, border: "1px solid #E3DBCB",
    overflow: "hidden",
  },
  dayColToday: { borderColor: "#B5654A", boxShadow: "0 0 0 1px #B5654A" },
  dayHeader: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 10px 10px 14px", borderBottom: "1px solid #F0EBE0",
  },
  dayName: { fontSize: 12, color: "#8A8275", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  dayNum: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#2A2622" },
  dayNumToday: { color: "#B5654A" },
  dayBody: { padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6 },
  availAddBtn: {
    marginLeft: "auto", width: 26, height: 26, borderRadius: 7, border: "1px solid #DCD4C4",
    background: "#FAF7F1", color: "#6E7F5C", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },

  apptCard: {
    display: "flex", flexDirection: "column", gap: 1,
    background: "#FAF7F1", borderLeft: "5px solid #B5654A",
    borderRadius: 8, padding: "8px 10px", textAlign: "left",
    border: "none", cursor: "pointer", width: "100%",
  },
  apptTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  apptTime: { fontSize: 11.5, color: "#8A8275", fontWeight: 600 },
  apptClient: { fontSize: 14, fontWeight: 600, color: "#2A2622", fontFamily: "'Inter', sans-serif" },
  apptService: { fontSize: 12, color: "#6E6555" },
  statusDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  openSlotCard: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
    background: "#F2F5EF", border: "1px dashed #A9BB9C", borderRadius: 8, padding: "7px 10px",
  },
  openSlotInfo: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#4A5A40", fontWeight: 600 },
  openSlotTag: { fontSize: 10, color: "#6E7F5C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" },
  slotMiniBtn: {
    width: 22, height: 22, borderRadius: 6, border: "none", background: "#6E7F5C", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  slotMiniBtnGhost: {
    width: 22, height: 22, borderRadius: 6, border: "1px solid #C9D4C0", background: "none", color: "#6E7F5C",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },

  emptySlot: {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: 38, borderRadius: 8, border: "1.5px dashed #DCD4C4",
    background: "none", color: "#B5A98F", cursor: "pointer",
  },
  addMoreBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    fontSize: 11.5, color: "#8A8275", background: "none", border: "none",
    cursor: "pointer", padding: "4px 0",
  },

  fieldLabel: {
    display: "block", fontSize: 12, fontWeight: 600, color: "#6E6555",
    margin: "14px 0 6px", textTransform: "uppercase", letterSpacing: "0.03em",
  },
  input: {
    width: "100%", padding: "11px 13px", borderRadius: 10,
    border: "1.5px solid #DCD4C4", fontSize: 14.5, fontFamily: "'Inter', sans-serif",
    background: "#fff", color: "#2A2622", boxSizing: "border-box",
  },
  fieldRow: { display: "flex", gap: 10 },

  serviceChips: { display: "flex", flexWrap: "wrap", gap: 8 },
  serviceChip: {
    padding: "9px 14px", borderRadius: 14, border: "1.5px solid #DCD4C4",
    background: "#fff", fontSize: 13, fontWeight: 600, color: "#2A2622",
    cursor: "pointer", fontFamily: "'Inter', sans-serif", textAlign: "left",
    lineHeight: 1.3,
  },
  endTimeNote: { fontSize: 12, color: "#8A8275", marginTop: 8 },
  businessInfoCard: {
    background: "#fff", borderRadius: 12, border: "1px solid #E3DBCB",
    padding: "11px 14px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 6,
  },
  businessInfoRow: {
    display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#2A2622",
  },

  statusRow: { display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0 4px" },
  statusChip: {
    padding: "6px 11px", borderRadius: 16, border: "1.5px solid #DCD4C4",
    background: "#fff", fontSize: 11.5, fontWeight: 600, color: "#2A2622",
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  },

  waBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    marginTop: 16, padding: "11px", borderRadius: 10, background: "#3DA854",
    color: "#fff", fontWeight: 600, fontSize: 13.5, textDecoration: "none",
  },
  waIconBtn: {
    width: 36, height: 36, borderRadius: 10, background: "#3DA854", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },

  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(42,38,34,0.55)",
    display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50,
  },
  modal: {
    background: "#EFE9DF", borderRadius: "20px 20px 0 0", padding: "18px 18px 22px",
    width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto",
    boxSizing: "border-box",
  },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, margin: 0 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, border: "none", background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#2A2622",
  },
  iconBtnGhost: {
    width: 30, height: 30, borderRadius: 8, border: "none", background: "none",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#A6483A",
  },
  modalActions: { display: "flex", gap: 8, marginTop: 20, alignItems: "center" },
  cancelBtn: {
    padding: "10px 16px", borderRadius: 10, border: "1.5px solid #DCD4C4",
    background: "#fff", fontWeight: 600, fontSize: 13.5, cursor: "pointer", color: "#2A2622",
  },
  saveBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 18px", borderRadius: 10, border: "none",
    background: "#2A2622", color: "#EFE9DF", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
  },
  deleteBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 16px", borderRadius: 10, border: "1.5px solid #E0BBB0",
    background: "none", color: "#A6483A", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
  },

  availExistingRow: {
    display: "flex", alignItems: "center", gap: 8, background: "#fff",
    border: "1px solid #E3DBCB", borderRadius: 9, padding: "8px 11px",
  },
  closeDayBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid #E0BBB0",
    background: "none", color: "#A6483A", fontWeight: 600, fontSize: 12.5,
    cursor: "pointer", marginBottom: 14, fontFamily: "'Inter', sans-serif",
  },

  suggestList: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
    background: "#fff", borderRadius: 10, border: "1px solid #DCD4C4",
    overflow: "hidden", zIndex: 5, boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  },
  suggestItem: {
    display: "block", width: "100%", textAlign: "left", padding: "9px 13px",
    background: "none", border: "none", fontSize: 13.5, cursor: "pointer", color: "#2A2622",
  },

  dateScroller: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 },
  dateChip: {
    minWidth: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "9px 6px", borderRadius: 12, border: "1.5px solid #DCD4C4",
    background: "#fff", cursor: "pointer", flexShrink: 0,
  },
  dateChipActive: { background: "#2A2622", borderColor: "#2A2622" },
  dateChipDay: { fontSize: 10.5, color: "#8A8275", fontWeight: 600, textTransform: "uppercase" },
  dateChipNum: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#2A2622" },

  slotsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  slotBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "10px 4px", borderRadius: 10, border: "1.5px solid #DCD4C4",
    background: "#fff", fontSize: 13, fontWeight: 600, color: "#2A2622", cursor: "pointer",
  },
  emptyMsg: { fontSize: 13.5, color: "#8A8275", padding: "10px 0" },
  helperText: { fontSize: 12, color: "#8A8275" },

  confirmCard: {
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
    padding: "50px 20px", gap: 6,
  },
  confirmCheck: {
    width: 56, height: 56, borderRadius: "50%", background: "#6E7F5C",
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  confirmTitle: { fontFamily: "'Fraunces', serif", fontSize: 24, margin: "0 0 6px" },
  confirmDetail: { fontSize: 14.5, color: "#6E6555", margin: 0 },
  confirmPrice: { fontSize: 17, color: "#2A2622", fontWeight: 700, margin: "4px 0", fontFamily: "'Fraunces', serif" },

  clientList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 14 },
  clientRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
    background: "#fff", borderRadius: 12, border: "1px solid #E3DBCB",
    cursor: "pointer", textAlign: "left",
  },
  clientAvatarSm: {
    width: 32, height: 32, borderRadius: "50%", background: "#8B6F5C",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  clientRowName: { fontSize: 14.5, fontWeight: 600, color: "#2A2622" },
  clientRowMeta: { fontSize: 12, color: "#8A8275", marginTop: 1 },
  newBadge: {
    display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700,
    color: "#fff", background: "#B5654A", padding: "2px 7px", borderRadius: 8, textTransform: "uppercase",
  },
  newBadgeSm: {
    fontSize: 9.5, fontWeight: 700, color: "#B5654A", background: "#F5E6DE",
    padding: "1px 6px", borderRadius: 6, textTransform: "uppercase",
  },

  backBtn: {
    display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
    color: "#8A8275", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "0 0 14px", marginLeft: -4,
  },
  clientDetailHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  clientAvatar: {
    width: 46, height: 46, borderRadius: "50%", background: "#8B6F5C",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  clientDetailName: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 },
  clientDetailPhone: { fontSize: 13, color: "#8A8275", margin: "2px 0 0" },

  clientStatsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 6 },
  clientStatBox: {
    background: "#fff", border: "1px solid #E3DBCB", borderRadius: 10,
    padding: "10px 8px", textAlign: "center",
  },
  clientStatValue: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#2A2622" },
  clientStatLabel: { fontSize: 10, color: "#8A8275", marginTop: 2 },

  historyList: { display: "flex", flexDirection: "column", gap: 8 },
  historyItem: {
    display: "flex", gap: 10, background: "#fff", borderRadius: 10,
    border: "1px solid #E3DBCB", padding: "10px 12px", alignItems: "flex-start",
  },
  historyDate: { fontSize: 12.5, fontWeight: 600, color: "#2A2622" },
  historyService: { fontSize: 12.5, color: "#6E6555", marginTop: 1 },
  historyNotes: { fontSize: 12, color: "#8A8275", marginTop: 4, fontStyle: "italic" },
  historyStatusTag: { fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" },

  serviceList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  serviceRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
    background: "#fff", borderRadius: 12, border: "1px solid #E3DBCB",
  },
  serviceRowName: { fontSize: 14.5, fontWeight: 600, color: "#2A2622" },
  serviceRowMeta: { fontSize: 12, color: "#8A8275", marginTop: 1 },
  addServiceBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    width: "100%", padding: "12px", borderRadius: 12, border: "1.5px dashed #C9BFA8",
    background: "none", color: "#6E6555", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
  },
  newServiceForm: { background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #E3DBCB" },
  colorRow: { display: "flex", gap: 8 },
  colorDot: {
    width: 28, height: 28, borderRadius: "50%", border: "2px solid transparent", cursor: "pointer",
  },
  colorDotActive: { border: "2px solid #2A2622", boxShadow: "0 0 0 2px #fff inset" },

  exportBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%", padding: "12px", borderRadius: 12, border: "1.5px solid #DCD4C4",
    background: "#fff", color: "#2A2622", fontWeight: 600, fontSize: 13.5,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  },
};

export default styles;
