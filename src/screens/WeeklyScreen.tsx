import { useEffect, useMemo, useState } from "react";
import { useSession } from "../session/SessionContext";
import { subscribeToRequests } from "../api/requests";
import { toDateString, todayString } from "../dateUtils";
import { displayTeamName } from "../teamDisplay";
import { categoryOfVacationType } from "../constants";
import type { RequestEntry } from "../types";
import { BottomNav, JbScreen, ScreenTop } from "../components/JbLayout";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

// 주간현황 괄호 안 표시: 연가는 종일/반차를 구분하고, 나머지는 대분류(병가·공가·청원휴가 등)로 짧게.
function kindLabel(e: RequestEntry): string {
  if (e.leaveType === "연가(종일)") return "연가";
  if (e.leaveType === "연가(오전)") return "오전반차";
  if (e.leaveType === "연가(오후)") return "오후반차";
  return (e.leaveType && categoryOfVacationType(e.leaveType)) || e.leaveType || "휴가";
}

function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // 월요일 = 0
  d.setDate(d.getDate() - offset);
  return d;
}

// 메인 "주간현황": 월~일 한 주 동안의 휴가자(관리자가 승인한 신청만)를 요일별 상자로 보여준다. 읽기 전용.
export default function WeeklyScreen() {
  const { teamName } = useSession();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [vacations, setVacations] = useState<RequestEntry[]>([]);

  useEffect(() => {
    if (!teamName) return;
    return subscribeToRequests(teamName, "vacation", setVacations);
  }, [teamName]);

  const today = todayString();
  const days = useMemo(
    () =>
      WEEKDAYS.map((w, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return { date: toDateString(d), label: `${d.getMonth() + 1}/${d.getDate()}`, weekday: w, month: d.getMonth() + 1, day: d.getDate() };
      }),
    [weekStart]
  );

  const byDate = useMemo(() => {
    const map: Record<string, RequestEntry[]> = {};
    for (const e of vacations) {
      if (!e.confirmedAt) continue;
      (map[e.date] ??= []).push(e);
    }
    return map;
  }, [vacations]);

  const total = days.reduce((sum, d) => sum + new Set((byDate[d.date] ?? []).map((e) => e.name)).size, 0);
  const first = days[0];
  const last = days[6];

  const shiftWeek = (delta: number) =>
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });

  return (
    <JbScreen>
      <ScreenTop title="주간현황" />
      <div className="jb-body jb-weekly">
        <div className="jb-weekbar">
          <button type="button" aria-label="지난주" onClick={() => shiftWeek(-1)}>
            ‹
          </button>
          <b>
            {first.month}월 {first.day}일 (월) ~ {last.month}월 {last.day}일 (일)
          </b>
          <button type="button" aria-label="다음 주" onClick={() => shiftWeek(1)}>
            ›
          </button>
        </div>
        <div className="jb-weeksum">
          <span>{teamName ? displayTeamName(teamName) : ""} · 이번 주 휴가자</span>
          <b>연인원 {total}명</b>
        </div>
        <div className="jb-week">
          {days.map((d, i) => {
            const list = byDate[d.date] ?? [];
            const cls = d.date === today ? "today" : i === 5 ? "sat" : i === 6 ? "sun" : "";
            return (
              <div key={d.date} className={`jb-wcol ${cls}`}>
                <div className="jb-wh">
                  {d.label}
                  <small>
                    {d.weekday}
                    {d.date === today ? " · 오늘" : ""}
                  </small>
                </div>
                <div className="jb-wlist">
                  {list.length === 0 ? (
                    <div className="jb-wnone">-</div>
                  ) : (
                    list.map((e) => (
                      <div key={e.id} className="jb-wname">
                        <b>{e.name}</b>
                        <i>({kindLabel(e)})</i>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="jb-note" style={{ marginTop: 8 }}>
          ※ 이름 아래 괄호는 휴가 종류 · 관리자가 승인한 휴가만 표시
        </p>
      </div>
      <BottomNav />
    </JbScreen>
  );
}
