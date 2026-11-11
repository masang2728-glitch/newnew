import { useMemo, useState } from "react";
import { ANNUAL_LEAVE_DAYS, categoryOfVacationType } from "../constants";
import { dayOffReason, formatDays, leaveDaysOf, otherLeaveDaysOf, vacationDetail } from "../leave";
import type { RequestEntry } from "../types";

// "나의 휴가 사용 일수"를 누르면 뜨는 팝업: 올해 본인이 신청해 관리자가 승인한 휴가 내역.
// 화면 표시만 한다 (자료를 고치거나 지우지 않는다).

type Kind = "연가" | "외출" | "청원휴가" | "병가" | "공가" | "특별휴가" | "기타";
const OTHER_KINDS: Kind[] = ["청원휴가", "병가", "공가", "특별휴가", "기타"];
const FILTERS: ("전체" | Kind)[] = ["전체", "연가", "외출", ...OTHER_KINDS];
const SHORT: Partial<Record<Kind, string>> = { 청원휴가: "청원", 특별휴가: "특별" };

// 예전에 저장된 휴가 종류 이름(세부유형 없이 저장하던 시절)도 알맞은 분류로 묶는다.
const LEGACY_KIND: Record<string, Kind> = {
  연가: "연가",
  종일: "연가",
  "1일 휴가": "연가",
  오전반차: "연가",
  오후반차: "연가",
  청원: "청원휴가",
  병가: "병가",
  공가: "공가",
};

function kindOf(e: RequestEntry): Kind {
  if (!e.leaveType) return "기타";
  const category = categoryOfVacationType(e.leaveType);
  if (category) return category as Kind;
  return LEGACY_KIND[e.leaveType] ?? "기타";
}

interface Row {
  entry: RequestEntry;
  kind: Kind;
  days: number;
  deducted: boolean; // 연가에서 차감되는 휴가인지 (메인의 "나의 휴가 사용 일수"와 같은 기준)
  dayOff?: string; // 주말·공휴일에 올린 연가·외출: 차감하지 않고 그 이유를 보여준다
}

export default function MyLeaveModal({
  entries,
  year,
  onClose,
}: {
  entries: RequestEntry[];
  year: string;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<"전체" | Kind>("전체");

  const rows: Row[] = useMemo(
    () =>
      entries
        .map((entry) => {
          const kind = kindOf(entry);
          const leaveDays = leaveDaysOf(entry);
          if (leaveDays > 0) {
            const dayOff = dayOffReason(entry.date);
            return { entry, kind, deducted: !dayOff, dayOff, days: leaveDays };
          }
          return { entry, kind, deducted: false, days: otherLeaveDaysOf(entry) };
        })
        .sort((a, b) => (a.entry.date < b.entry.date ? 1 : a.entry.date > b.entry.date ? -1 : 0)),
    [entries]
  );

  const annualDays = rows.filter((r) => r.deducted && r.kind !== "외출").reduce((s, r) => s + r.days, 0);
  const outingDays = rows.filter((r) => r.deducted && r.kind === "외출").reduce((s, r) => s + r.days, 0);
  const usedDays = annualDays + outingDays;
  const outingHours = Math.round(outingDays * 8 * 10) / 10;
  const pct = (d: number) => `${Math.min(100, (d / ANNUAL_LEAVE_DAYS) * 100)}%`;

  const others = OTHER_KINDS.map((kind) => {
    const list = rows.filter((r) => r.kind === kind);
    return { kind, count: list.length, days: list.reduce((s, r) => s + r.days, 0) };
  });

  const visible = filter === "전체" ? rows : rows.filter((r) => r.kind === filter);

  return (
    <div className="jb-modal-backdrop" onClick={onClose}>
      <div
        className="jb-modal myleave"
        role="dialog"
        aria-modal="true"
        aria-label="나의 휴가 사용 내역"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jb-modal-head">
          <h3>{year}년 나의 휴가</h3>
          <button type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="jb-modal-sub">관리자가 승인한 신청만 표시합니다</p>

        <section className="myleave-annual">
          <div className="myleave-annual-head">
            <b>연가 사용</b>
            <span>
              <strong>{formatDays(usedDays)}</strong> / {ANNUAL_LEAVE_DAYS}일 · 남은{" "}
              {formatDays(Math.max(0, ANNUAL_LEAVE_DAYS - usedDays))}일
            </span>
          </div>
          <div className="myleave-bar" aria-hidden="true">
            <i className="annual" style={{ width: pct(annualDays) }} />
            <i className="outing" style={{ width: pct(outingDays) }} />
          </div>
          <div className="myleave-legend">
            <span>
              <i className="annual" />
              연가 {formatDays(annualDays)}일
            </span>
            <span>
              <i className="outing" />
              외출 {formatDays(outingDays)}일{outingHours > 0 ? ` (${outingHours}시간)` : ""}
            </span>
          </div>
        </section>

        <p className="myleave-section-title">
          연가 외 휴가 <small>· 연가에서 차감되지 않음</small>
        </p>
        <div className="myleave-others">
          {others.map((o) => (
            <div key={o.kind} className={`myleave-other kind-${o.kind}`}>
              <small>{SHORT[o.kind] ?? o.kind}</small>
              <b>{o.days ? `${formatDays(o.days)}일` : "0"}</b>
              <em>{o.count}건</em>
            </div>
          ))}
        </div>

        <div className="myleave-filters" role="group" aria-label="휴가 종류로 보기">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={f === filter ? "active" : ""}
              aria-pressed={f === filter}
              onClick={() => setFilter(f)}
            >
              {f === "전체" ? "전체" : SHORT[f] ?? f}
            </button>
          ))}
        </div>

        <div className="myleave-list">
          {visible.length === 0 ? (
            <p className="jb-empty">해당 휴가 내역이 없습니다.</p>
          ) : (
            visible.map((r) => (
              <div key={r.entry.id} className="jb-row">
                <div>
                  <span className="myleave-row-top">
                    <b>{r.entry.date}</b>
                    <span className={`myleave-badge kind-${r.kind}`}>{SHORT[r.kind] ?? r.kind}</span>
                    <span className={`myleave-days${r.deducted ? " deducted" : ""}`}>
                      {r.dayOff ? `${r.dayOff} · 미차감` : `${r.deducted ? "−" : ""}${formatDays(r.days)}일`}
                    </span>
                  </span>
                  <small>{vacationDetail(r.entry)}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
