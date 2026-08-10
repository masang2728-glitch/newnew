import type { CSSProperties } from "react";
import { getMonthGrid, toDateString } from "../dateUtils";
import { getHolidayName } from "../holidays";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const SATURDAY_COLOR = "#2563EB";
const SUNDAY_HOLIDAY_COLOR = "#DC2626";

interface MonthCalendarProps {
  month: string; // "YYYY-MM"
  onMonthChange: (month: string) => void;
  minDate?: string;
  selectedDates?: Set<string>;
  singleSelectedDate?: string | null;
  countByDate?: Record<string, number>;
  onDayClick: (dateString: string) => void;
  themeColor: string;
}

export default function MonthCalendar({
  month,
  onMonthChange,
  minDate,
  selectedDates,
  singleSelectedDate,
  countByDate,
  onDayClick,
  themeColor,
}: MonthCalendarProps) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const cells = getMonthGrid(year, monthNum);
  const today = toDateString(new Date());

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthNum - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={() => shiftMonth(-1)} aria-label="이전 달">
          ‹
        </button>
        <div className="calendar-title">
          {year}년 {monthNum}월
        </div>
        <button type="button" className="calendar-nav" onClick={() => shiftMonth(1)} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className="calendar-weekday"
            style={i === 0 ? { color: SUNDAY_HOLIDAY_COLOR } : i === 6 ? { color: SATURDAY_COLOR } : undefined}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="calendar-cell calendar-cell-empty" />;
          const dateString = toDateString(date);
          const disabled = Boolean(minDate && dateString < minDate);
          const isSelected = selectedDates?.has(dateString) || singleSelectedDate === dateString;
          const isToday = dateString === today;
          const count = countByDate?.[dateString] ?? 0;
          const dow = date.getDay(); // 0=Sun..6=Sat
          const holidayName = getHolidayName(dateString);

          let dayStyle: CSSProperties | undefined;
          if (isSelected) {
            dayStyle = { backgroundColor: themeColor, color: "#fff", borderColor: themeColor };
          } else if (isToday) {
            dayStyle = { color: themeColor, borderColor: themeColor };
          } else if (!disabled) {
            if (holidayName || dow === 0) dayStyle = { color: SUNDAY_HOLIDAY_COLOR };
            else if (dow === 6) dayStyle = { color: SATURDAY_COLOR };
          }

          return (
            <div key={i} className="calendar-cell">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDayClick(dateString)}
                title={holidayName}
                className={
                  "calendar-day" +
                  (disabled ? " calendar-day-disabled" : "") +
                  (isToday && !isSelected ? " calendar-day-today" : "")
                }
                style={dayStyle}
              >
                {date.getDate()}
              </button>
              {count > 0 && (
                <span className="calendar-count-badge" style={{ backgroundColor: themeColor }}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
