import { useEffect, useState, type CSSProperties } from "react";

type StyleWithCustomProps = CSSProperties & { "--thumb-color"?: string };

interface TimeRangeSliderProps {
  startTime: string; // "HH:MM" or ""
  endTime: string; // "HH:MM" or ""
  onChange: (startTime: string, endTime: string) => void;
  themeColor: string;
  minHour?: number;
  maxHour?: number;
}

const DEFAULT_MIN_HOUR = 7;
const DEFAULT_MAX_HOUR = 17;

function toHourFloat(hhmm: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h + (m === 30 ? 0.5 : 0);
}

function toHHMM(hourFloat: number): string {
  const h = Math.floor(hourFloat);
  const m = hourFloat % 1 >= 0.5 ? "30" : "00";
  return `${String(h).padStart(2, "0")}:${m}`;
}

export default function TimeRangeSlider({
  startTime,
  endTime,
  onChange,
  themeColor,
  minHour = DEFAULT_MIN_HOUR,
  maxHour = DEFAULT_MAX_HOUR,
}: TimeRangeSliderProps) {
  const [start, setStart] = useState(() => toHourFloat(startTime) ?? 8);
  const [end, setEnd] = useState(() => toHourFloat(endTime) ?? 17);

  useEffect(() => {
    const s = toHourFloat(startTime);
    const e = toHourFloat(endTime);
    if (s !== null) setStart(s);
    if (e !== null) setEnd(e);
  }, [startTime, endTime]);

  const commit = (nextStart: number, nextEnd: number) => {
    setStart(nextStart);
    setEnd(nextEnd);
    onChange(toHHMM(nextStart), toHHMM(nextEnd));
  };

  const pct = (v: number) => ((v - minHour) / (maxHour - minHour)) * 100;
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  const style: StyleWithCustomProps = { "--thumb-color": themeColor };

  return (
    <div className="range-block" style={style}>
      <div className="range-readout">
        <span style={{ color: themeColor }}>{toHHMM(start)}</span> ~{" "}
        <span style={{ color: themeColor }}>{toHHMM(end)}</span>
      </div>
      <div className="range-slider">
        <div className="range-base" />
        <div
          className="range-fill"
          style={{
            left: `${pct(start)}%`,
            width: `${Math.max(pct(end) - pct(start), 0)}%`,
            backgroundColor: themeColor,
          }}
        />
        <input
          type="range"
          min={minHour}
          max={maxHour}
          step={0.5}
          value={start}
          onChange={(e) => commit(Math.min(Number(e.target.value), end), end)}
          aria-label="시작시간"
        />
        <input
          type="range"
          min={minHour}
          max={maxHour}
          step={0.5}
          value={end}
          onChange={(e) => commit(start, Math.max(Number(e.target.value), start))}
          aria-label="종료시간"
        />
      </div>
      <div className="range-ticks">
        {hours.map((h) => (
          <span key={h}>{h % 2 === minHour % 2 ? h : ""}</span>
        ))}
      </div>
    </div>
  );
}
