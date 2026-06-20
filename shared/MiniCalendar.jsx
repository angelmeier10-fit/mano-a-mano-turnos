import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  dateKey, addMonths, getMonthGrid,
  DAY_NAMES, MONTH_NAMES,
} from "./helpers";
import styles from "./styles";

// ---------- Mini-calendario reutilizable (selector visual de fecha) ----------
// Compartido entre agenda-app (elegir fecha de turno) y reservas-app (elegir
// fecha de reserva). highlightToday resalta el día de hoy; markedDateKeys
// marca con un puntito los días que tienen algo (ej: cupos disponibles).
export function MiniCalendar({ selectedDateKey, onSelectDate, markedDateKeys, highlightToday = true, isDaySelectable }) {
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
            const selectable = isDaySelectable ? isDaySelectable(dKey) : true;
            return (
              <button
                type="button"
                key={di}
                disabled={!selectable}
                onClick={() => selectable && onSelectDate(dKey)}
                style={{
                  ...styles.miniCalDay,
                  ...(inMonth ? {} : styles.miniCalDayOutMonth),
                  ...(isToday ? styles.miniCalDayToday : {}),
                  ...(isSelected ? styles.miniCalDaySelected : {}),
                  ...(selectable ? {} : { opacity: 0.3, cursor: "default" }),
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