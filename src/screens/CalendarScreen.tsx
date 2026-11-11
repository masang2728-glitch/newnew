import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "../session/SessionContext";
import { subscribeToRequests } from "../api/requests";
import { subscribeToMembers } from "../api/members";
import { vacationDetail } from "../leave";
import { todayString } from "../dateUtils";
import type { RequestEntry, RequestType, TeamMember } from "../types";
import MonthCalendar from "../components/MonthCalendar";
import { BottomNav, JbScreen, ScreenTop } from "../components/JbLayout";

const COLORS: Record<RequestType, string> = { vacation: "#2E6848", overtime: "#C46A22" };

function detail(e: RequestEntry): string {
  if (e.subType) return e.subType;
  return vacationDetail(e);
}

// 메인의 "캘린더" 화면: 휴가/야근 탭, 날짜별 인원, 날짜를 누르면 명단.
// 기존 신청 화면의 "캘린더 보기"와 같은 기준(관리자가 확인한 신청만)으로 보여준다. 읽기 전용.
export default function CalendarScreen() {
  const { teamName } = useSession();
  const [searchParams] = useSearchParams();
  const [type, setType] = useState<RequestType>(searchParams.get("tab") === "overtime" ? "overtime" : "vacation");
  const [month, setMonth] = useState(todayString().slice(0, 7));
  const [selected, setSelected] = useState<string>(todayString());
  const [entries, setEntries] = useState<Record<RequestType, RequestEntry[]>>({ vacation: [], overtime: [] });

  useEffect(() => {
    if (!teamName) return;
    const unsubVacation = subscribeToRequests(teamName, "vacation", (list) =>
      setEntries((prev) => ({ ...prev, vacation: list }))
    );
    const unsubOvertime = subscribeToRequests(teamName, "overtime", (list) =>
      setEntries((prev) => ({ ...prev, overtime: list }))
    );
    return () => {
      unsubVacation();
      unsubOvertime();
    };
  }, [teamName]);

  // 명단은 업데이트 전처럼 순번 오름차순으로 보여준다
  const [roster, setRoster] = useState<TeamMember[]>([]);
  useEffect(() => {
    if (!teamName) return;
    return subscribeToMembers(teamName, setRoster);
  }, [teamName]);
  const orderByName = useMemo(() => new Map(roster.map((m) => [m.name, m.orderNo])), [roster]);

  const confirmed = useMemo(() => entries[type].filter((e) => e.confirmedAt), [entries, type]);

  const byDate = useMemo(() => {
    const map: Record<string, RequestEntry[]> = {};
    for (const e of confirmed) (map[e.date] ??= []).push(e);
    return map;
  }, [confirmed]);

  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of Object.keys(byDate)) map[d] = new Set(byDate[d].map((e) => e.name)).size;
    return map;
  }, [byDate]);

  const splitCountByDate = useMemo(() => {
    if (type !== "overtime") return undefined;
    const map: Record<string, { early: number; late: number }> = {};
    for (const d of Object.keys(byDate)) {
      map[d] = {
        early: new Set(byDate[d].filter((e) => e.subType === "조출").map((e) => e.name)).size,
        late: new Set(byDate[d].filter((e) => e.subType === "야근").map((e) => e.name)).size,
      };
    }
    return map;
  }, [byDate, type]);

  const dayList = useMemo(
    () =>
      (byDate[selected] ?? [])
        .slice()
        .sort((a, b) => (orderByName.get(a.name) ?? Infinity) - (orderByName.get(b.name) ?? Infinity)),
    [byDate, selected, orderByName]
  );
  const label = type === "vacation" ? "휴가" : "야근";
  const [, m, d] = selected.split("-");

  return (
    <JbScreen>
      <ScreenTop
        title="캘린더"
        tabs={["휴가", "야근"]}
        activeTab={type === "vacation" ? 0 : 1}
        onTab={(i) => setType(i === 0 ? "vacation" : "overtime")}
      />
      <div className="jb-body">
        {type === "overtime" && (
          <div className="calendar-legend">
            <span className="calendar-legend-item">
              <span className="calendar-legend-dot calendar-split-early" /> 조출 인원
            </span>
            <span className="calendar-legend-item">
              <span className="calendar-legend-dot calendar-split-late" /> 야근 인원
            </span>
          </div>
        )}
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          singleSelectedDate={selected}
          countByDate={countByDate}
          splitCountByDate={splitCountByDate}
          onDayClick={setSelected}
          themeColor={COLORS[type]}
        />
        <section className="jb-box jb-daylist">
          <h3>
            {Number(m)}월 {Number(d)}일 {label} {new Set(dayList.map((e) => e.name)).size}명
          </h3>
          {dayList.length === 0 ? (
            <p className="jb-empty">관리자가 확인한 {label} 신청이 없습니다.</p>
          ) : (
            dayList.map((e) => (
              <div key={e.id} className="jb-row">
                <div>
                  <b>{e.name}</b>
                  <small>{detail(e)}</small>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
      <BottomNav />
    </JbScreen>
  );
}
