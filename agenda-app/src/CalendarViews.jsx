import React, { useMemo } from "react";
import {
  dateKey, getMonthGrid, DAY_NAMES,
} from "../../shared/helpers";
import styles from "../../shared/styles";

export { MiniCalendar } from "../../shared/MiniCalendar";

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
