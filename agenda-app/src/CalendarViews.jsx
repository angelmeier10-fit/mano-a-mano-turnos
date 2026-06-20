import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  dateKey, addDays, addMonths, getMonthGrid,
  DAY_NAMES, MONTH_NAMES, STATUS,
} from "../../shared/helpers";
import styles from "../../shared/styles";

// ---------- Mini-calendario reutilizable (selector visual de fecha) ----------
// Usado tanto en el modal de turno (elegir fecha) como base de la vista mensual.
export function MiniCalendar({ selectedDateKey, onSelectDate, markedDateKeys, highlightToday = true }) {
  const initial = selectedDateKey ? new Date(selectedDateKey + "T00:00:00") : new Date();
  const [viewMonth, setViewMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const weeks = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);
  const todayKey = dateKey(new Date());
  const markedSet = markedDateKeys || new Set();

  return (
    <div style={styles.miniCalendar}>
      <div style={styles.miniCalHeader}>
        <button type="button" style={styles.miniCalNavBtn} onClick={() => setViewMonth(addMonths(viewMonth, -1))}>
          <ChevronLeft size={16} />
        </button>
        <span style={styles.miniCalTitle}>{MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
        <button type="button" style={styles.miniCalNavBtn} onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div style={styles.miniCalWeekDays}>
        {DAY_NAMES.map(d => <span key={d} style={styles.miniCalWeekDay}>{d}</span>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={styles.miniCalRow}>
          {week.map((d, di) => {
            const dKey = dateKey(d);
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const isToday = highlightToday && dKey === todayKey;
            const isSelected = dKey === selectedDateKey;
            const hasMark = markedSet.has(dKey);
            return (
              <button
                type="button"
                key={di}
                onClick={() => onSelectDate(dKey)}
                style={{
                  ...styles.miniCalDay,
                  ...(inMonth ? {} : styles.miniCalDayOutMonth),
                  ...(isToday ? styles.miniCalDayToday : {}),
                  ...(isSelected ? styles.miniCalDaySelected : {}),
                }}
              >
                {d.getDate()}
                {hasMark && <span style={styles.miniCalDot} />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------- Vista mensual de la Agenda ----------
// Calendario de mes completo, de solo lectura: al tocar un día navega a esa semana.
export function MonthView({ appointments, monthDate, onSelectDay }) {
  const weeks = useMemo(() => getMonthGrid(monthDate), [monthDate]);
  const todayKey = dateKey(new Date());

  const apptCountByDate = useMemo(() => {
    const map = {};
    appointments.forEach(a => {
      if (a.status === "cancelado") return;
      map[a.dateKey] = (map[a.dateKey] || 0) + 1;
    });
    return map;
  }, [appointments]);

  return (
    <div style={styles.monthGrid}>
      <div style={styles.monthWeekDaysRow}>
        {DAY_NAMES.map(d => <span key={d} style={styles.monthWeekDayLabel}>{d}</span>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={styles.monthWeekRow}>
          {week.map((d, di) => {
            const dKey = dateKey(d);
            const inMonth = d.getMonth() === monthDate.getMonth();
            const isToday = dKey === todayKey;
            const count = apptCountByDate[dKey] || 0;
            return (
              <button
                type="button"
                key={di}
                onClick={() => onSelectDay(d)}
                style={{
                  ...styles.monthDayCell,
                  ...(inMonth ? {} : styles.monthDayCellOutMonth),
                  ...(isToday ? styles.monthDayCellToday : {}),
                }}
              >
                <span style={styles.monthDayNum}>{d.getDate()}</span>
                {count > 0 && (
                  <span style={styles.monthDayBadge}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}