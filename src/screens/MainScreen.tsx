import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../session/SessionContext";
import { subscribeToRequests } from "../api/requests";
import { todayString } from "../dateUtils";
import { displayTeamName } from "../teamDisplay";
import { ANNUAL_LEAVE_DAYS } from "../constants";
import { formatDays, leaveDaysOf } from "../leave";
import type { RequestEntry } from "../types";
import { BottomNav } from "../components/JbLayout";

// 장비단 리디자인 메인 화면. 숫자는 모두 기존 신청 자료(휴가/야근 표)를 읽기만 해서 계산한다.
export default function MainScreen() {
  const { userName, teamName, isAdmin, homeFactory } = useSession();
  const navigate = useNavigate();
  const [vacations, setVacations] = useState<RequestEntry[]>([]);
  const [overtimes, setOvertimes] = useState<RequestEntry[]>([]);

  useEffect(() => {
    if (!teamName) return;
    const unsubVacation = subscribeToRequests(teamName, "vacation", setVacations);
    const unsubOvertime = subscribeToRequests(teamName, "overtime", setOvertimes);
    return () => {
      unsubVacation();
      unsubOvertime();
    };
  }, [teamName]);

  const today = todayString();
  const thisYear = today.slice(0, 4);
  const teamLabel = teamName ? displayTeamName(teamName) : "";

  // 오늘 인원은 캘린더와 같은 기준(관리자가 확인한 신청)으로 센다.
  const todayLeave = useMemo(
    () => new Set(vacations.filter((e) => e.date === today && e.confirmedAt).map((e) => e.name)).size,
    [vacations, today]
  );
  const todayOvertime = useMemo(
    () => new Set(overtimes.filter((e) => e.date === today && e.confirmedAt).map((e) => e.name)).size,
    [overtimes, today]
  );
  // 승인 대기: 우리 직장에서 아직 관리자가 확인하지 않은 신청 (휴가 + 야근)
  const pending = useMemo(
    () => vacations.filter((e) => !e.confirmedAt).length + overtimes.filter((e) => !e.confirmedAt).length,
    [vacations, overtimes]
  );
  // 나의 휴가 사용 일수: 올해 내 연가·외출 중 관리자가 승인한 것만 (승인 대기는 빼고 센다)
  const myDays = useMemo(
    () =>
      vacations
        .filter((e) => e.name === userName && e.date.startsWith(thisYear) && e.confirmedAt)
        .reduce((sum, e) => sum + leaveDaysOf(e), 0),
    [vacations, userName, thisYear]
  );
  const percent = Math.min(100, (myDays / ANNUAL_LEAVE_DAYS) * 100);

  // 오늘 휴가/야근 인원 칸을 누르면 띄우는 명단 팝업 (캘린더와 같은 기준: 승인된 신청)
  const [popup, setPopup] = useState<"vacation" | "overtime" | null>(null);
  const todayList = useMemo(() => {
    if (!popup) return [];
    const source = popup === "vacation" ? vacations : overtimes;
    const byName = new Map<string, string[]>();
    for (const e of source) {
      if (e.date !== today || !e.confirmedAt) continue;
      const detail =
        popup === "overtime"
          ? e.subType ?? ""
          : `${e.leaveType ?? ""}${e.startTime && e.endTime ? ` · ${e.startTime}~${e.endTime}` : ""}`;
      byName.set(e.name, [...(byName.get(e.name) ?? []), detail]);
    }
    return [...byName.entries()].map(([name, details]) => ({
      name,
      // 같은 날 조출과 야근을 모두 신청한 사람은 "조출 + 야근"으로 한 줄에 보여준다
      detail: details.join(" + "),
    }));
  }, [popup, vacations, overtimes, today]);
  const [, mm, dd] = today.split("-");

  return (
    <div className="jb-main">
      <header className="jb-hello">
        <div>
          <small>안녕하세요!</small>
          <b>{userName} 님 👋</b>
        </div>
        <button type="button" className="jb-bell" aria-label="승인 대기 보기" onClick={() => navigate("/pending")}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a6 6 0 0 0-6 6c0 6-3 8-3 9h18c0-1-3-3-3-9a6 6 0 0 0-6-6zM9.5 19a2.5 2.5 0 0 0 5 0z" />
          </svg>
          {pending > 0 && <span className="jb-bell-dot">{pending}</span>}
        </button>
      </header>

      <div className="jb-banner">
        <b>오늘도 수고하셨습니다!</b>
        <span>즐거운 하루 되세요 :)</span>
        <i aria-hidden="true" />
      </div>

      <div className="jb-sheet">
        <h2>주요 메뉴</h2>
        <div className="jb-tiles">
          <button type="button" className="jb-tile" onClick={() => navigate("/calendar")}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
            </svg>
            <b>캘린더</b>
            <small>(휴가/야근 현황)</small>
          </button>
          <button type="button" className="jb-tile" onClick={() => navigate("/vacation")}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20l1-5L16 4l4 4L9 19z" />
              <path d="M14 6l4 4" />
            </svg>
            <b>휴가 신청</b>
          </button>
          <button type="button" className="jb-tile" onClick={() => navigate("/overtime")}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <b>야근 신청</b>
          </button>
          <button type="button" className="jb-tile" onClick={() => navigate("/weekly")}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M9 9v12M3 13h18M3 17h18" />
            </svg>
            <b>주간현황</b>
            <small>(이번 주 휴가자)</small>
          </button>
        </div>

        <h2 className="jb-gap">오늘 현황</h2>
        <div className="jb-cards">
          <button type="button" className="jb-card" onClick={() => setPopup("vacation")}>
            <span>오늘 휴가 인원</span>
            <strong>
              {todayLeave} <small>명</small>
            </strong>
            <em className="jb-pill green">{teamLabel}</em>
          </button>
          <button type="button" className="jb-card" onClick={() => setPopup("overtime")}>
            <span>오늘 야근 인원</span>
            <strong>
              {todayOvertime} <small>명</small>
            </strong>
            <em className="jb-pill orange">{teamLabel}</em>
          </button>
          <button type="button" className="jb-card" onClick={() => navigate("/pending")}>
            <span>직장 승인 대기</span>
            <strong>
              {pending} <small>건</small>
            </strong>
            <em className={`jb-pill ${pending > 0 ? "amber" : "green"}`}>{pending > 0 ? "확인 필요" : "대기 없음"}</em>
          </button>
        </div>

        <section className="jb-box jb-usage">
          <h3>나의 휴가 사용 일수</h3>
          <div className="jb-usage-row">
            <span>올해 사용일수</span>
            <span>
              {formatDays(myDays)}일 / {ANNUAL_LEAVE_DAYS}일
            </span>
          </div>
          <div className="jb-bar" role="progressbar" aria-valuenow={myDays} aria-valuemin={0} aria-valuemax={ANNUAL_LEAVE_DAYS}>
            <i style={{ width: `${percent}%` }} />
          </div>
        </section>

        {(isAdmin || homeFactory) && (
          <section className="jb-box jb-admin">
            <h3>관리자 메뉴</h3>
            <div className="jb-admin-links">
              {isAdmin && (
                <button type="button" onClick={() => navigate("/team-dashboard")}>
                  직장 대시보드
                </button>
              )}
              {homeFactory && (
                <button type="button" onClick={() => navigate("/factory-dashboard")}>
                  공장 현황 대시보드
                </button>
              )}
              {isAdmin && (
                <button type="button" onClick={() => navigate("/accident-management")}>
                  사고관리
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {popup && (
        <div className="jb-modal-backdrop" onClick={() => setPopup(null)}>
          <div
            className="jb-modal"
            role="dialog"
            aria-modal="true"
            aria-label={popup === "vacation" ? "오늘 휴가자" : "오늘 야근자"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jb-modal-head">
              <h3>
                {Number(mm)}월 {Number(dd)}일 {popup === "vacation" ? "휴가" : "야근"} {todayList.length}명
              </h3>
              <button type="button" aria-label="닫기" onClick={() => setPopup(null)}>
                ✕
              </button>
            </div>
            <p className="jb-modal-sub">{teamLabel} · 관리자가 승인한 신청</p>
            {todayList.length === 0 ? (
              <p className="jb-empty">오늘 {popup === "vacation" ? "휴가" : "야근"} 인원이 없습니다.</p>
            ) : (
              <div className="jb-modal-list">
                {todayList.map((p) => (
                  <div key={p.name} className="jb-row">
                    <div>
                      <b>{p.name}</b>
                      <small>{p.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="jb-modal-more"
              onClick={() => navigate(popup === "vacation" ? "/calendar" : "/calendar?tab=overtime")}
            >
              캘린더에서 보기 ›
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
