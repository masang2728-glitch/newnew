import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchOrgGroups } from "../api/orgGroups";
import { fetchRequestsForTeams } from "../api/requests";
import type { RequestEntry } from "../types";
import { todayString } from "../dateUtils";
import { categoryOfVacationType } from "../constants";
import MonthCalendar from "../components/MonthCalendar";

const THEME_COLOR = "#0f766e";

// 사고현황표 형식의 "휴가/청원휴가/병가/공가/기타" 5개 열에 맞춘 집계.
// "휴가" 열 = "연가" 대분류, "기타" 열 = "특별휴가" + "기타" 대분류 합산. "외출"은 표에 없는 유형이라 제외.
type LeaveBucket = "휴가" | "청원휴가" | "병가" | "공가" | "기타";
const LEAVE_BUCKETS: LeaveBucket[] = ["휴가", "청원휴가", "병가", "공가", "기타"];
const CATEGORY_TO_BUCKET: Partial<Record<string, LeaveBucket>> = {
  연가: "휴가",
  청원휴가: "청원휴가",
  병가: "병가",
  공가: "공가",
  특별휴가: "기타",
  기타: "기타",
};

// 휴가 유형 구조가 몇 차례 바뀌면서 예전에 저장된 leaveType 값은 지금의 SUBTYPES_BY_CATEGORY에
// 없을 수 있다. 그 옛 기록도 집계에서 빠지지 않도록 별도로 매핑해둔다.
const LEGACY_BUCKET: Partial<Record<string, LeaveBucket>> = {
  연가: "휴가",
  종일: "휴가",
  "1일 휴가": "휴가",
  오전반차: "휴가",
  오후반차: "휴가",
  공가: "공가",
  청원: "청원휴가",
  병가: "병가",
  오전: "기타",
  오후: "기타",
};

function emptyBucketCounts(): Record<LeaveBucket, number> {
  return { 휴가: 0, 청원휴가: 0, 병가: 0, 공가: 0, 기타: 0 };
}

function bucketOf(entry: RequestEntry): LeaveBucket | null {
  const t = entry.leaveType;
  if (!t) return null;
  const category = categoryOfVacationType(t);
  if (category) return CATEGORY_TO_BUCKET[category] ?? null;
  return LEGACY_BUCKET[t] ?? null;
}

type OvertimeBucket = "조출" | "야근";
const OVERTIME_BUCKETS: OvertimeBucket[] = ["조출", "야근"];

function emptyOvertimeCounts(): Record<OvertimeBucket, number> {
  return { 조출: 0, 야근: 0 };
}

// 직장 표시 순서: 알려진 직장은 이 순서로 고정하고, 그 외 직장은 뒤에 가나다순으로 붙인다.
const TEAM_ORDER_PRIORITY = ["본부", "차체", "포탑", "유압", "해체"];
function sortTeams(teams: string[]): string[] {
  return [...teams].sort((a, b) => {
    const ia = TEAM_ORDER_PRIORITY.indexOf(a);
    const ib = TEAM_ORDER_PRIORITY.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, "ko");
  });
}

type DashboardTab = "leave" | "overtime";

export default function FactoryDashboardScreen() {
  const { homeFactory: activeFactory } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DashboardTab>("leave");
  const [teams, setTeams] = useState<string[]>([]);
  const [vacationEntries, setVacationEntries] = useState<RequestEntry[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<RequestEntry[]>([]);
  const [month, setMonth] = useState(todayString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(todayString());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeFactory) return;
    setLoading(true);
    try {
      const groups = await fetchOrgGroups();
      const myTeams = sortTeams(groups.filter((g) => g.factory === activeFactory).map((g) => g.team));
      setTeams(myTeams);
      const [vac, ot] = await Promise.all([
        fetchRequestsForTeams("vacation", myTeams),
        fetchRequestsForTeams("overtime", myTeams),
      ]);
      setVacationEntries(vac);
      setOvertimeEntries(ot);
    } catch {
      toast.error("현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeFactory]);

  // 관리자가 확인한 신청만 날짜별로 묶는다 (휴가는 표에서 다루는 5개 항목만).
  const leaveEntriesByDate = useMemo(() => {
    const map: Record<string, RequestEntry[]> = {};
    for (const e of vacationEntries) {
      if (!e.confirmedAt || !bucketOf(e)) continue;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [vacationEntries]);

  const overtimeEntriesByDate = useMemo(() => {
    const map: Record<string, RequestEntry[]> = {};
    for (const e of overtimeEntries) {
      if (!e.confirmedAt) continue;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [overtimeEntries]);

  const entriesByDate = tab === "leave" ? leaveEntriesByDate : overtimeEntriesByDate;

  // 캘린더 배지는 지금 보고 있는 탭(출타/특근) 기준으로 그날 신청한 인원 수를 보여준다.
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of Object.keys(entriesByDate)) map[d] = new Set(entriesByDate[d].map((e) => e.name)).size;
    return map;
  }, [entriesByDate]);

  const selectedLeaveEntries = useMemo(
    () => (selectedDate ? (leaveEntriesByDate[selectedDate] ?? []) : []),
    [selectedDate, leaveEntriesByDate]
  );
  const selectedOvertimeEntries = useMemo(
    () => (selectedDate ? (overtimeEntriesByDate[selectedDate] ?? []) : []),
    [selectedDate, overtimeEntriesByDate]
  );

  const leaveTeamCounts = useMemo(() => {
    const map: Record<string, Record<LeaveBucket, number>> = {};
    for (const t of teams) map[t] = emptyBucketCounts();
    for (const e of selectedLeaveEntries) {
      const bucket = bucketOf(e);
      if (!bucket) continue;
      if (!map[e.team]) map[e.team] = emptyBucketCounts();
      map[e.team][bucket] += 1;
    }
    return map;
  }, [teams, selectedLeaveEntries]);

  const leaveTotals = useMemo(() => {
    const totals = emptyBucketCounts();
    for (const team of teams) {
      const c = leaveTeamCounts[team];
      if (!c) continue;
      for (const b of LEAVE_BUCKETS) totals[b] += c[b];
    }
    return totals;
  }, [teams, leaveTeamCounts]);

  // "비고"는 사진 속 표처럼 항목(대분류)별로 묶고, 그 안에서 소속 직장을 함께 보여준다.
  const leaveRemarks = useMemo(() => {
    const map: Record<LeaveBucket, RequestEntry[]> = { 휴가: [], 청원휴가: [], 병가: [], 공가: [], 기타: [] };
    for (const e of selectedLeaveEntries) {
      const bucket = bucketOf(e);
      if (bucket) map[bucket].push(e);
    }
    return map;
  }, [selectedLeaveEntries]);

  const overtimeTeamCounts = useMemo(() => {
    const map: Record<string, Record<OvertimeBucket, number>> = {};
    for (const t of teams) map[t] = emptyOvertimeCounts();
    for (const e of selectedOvertimeEntries) {
      if (e.subType !== "조출" && e.subType !== "야근") continue;
      if (!map[e.team]) map[e.team] = emptyOvertimeCounts();
      map[e.team][e.subType] += 1;
    }
    return map;
  }, [teams, selectedOvertimeEntries]);

  const overtimeTotals = useMemo(() => {
    const totals = emptyOvertimeCounts();
    for (const team of teams) {
      const c = overtimeTeamCounts[team];
      if (!c) continue;
      for (const b of OVERTIME_BUCKETS) totals[b] += c[b];
    }
    return totals;
  }, [teams, overtimeTeamCounts]);

  const overtimeRemarks = useMemo(() => {
    const map: Record<OvertimeBucket, RequestEntry[]> = { 조출: [], 야근: [] };
    for (const e of selectedOvertimeEntries) {
      if (e.subType === "조출" || e.subType === "야근") map[e.subType].push(e);
    }
    return map;
  }, [selectedOvertimeEntries]);

  const handleExit = () => {
    navigate("/main", { replace: true });
  };

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: THEME_COLOR }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">{activeFactory} 현황 대시보드</h1>
            <div className="request-user">소속 직장 {teams.length}곳</div>
          </div>
          <button type="button" className="request-back" onClick={handleExit}>
            메인으로 ›
          </button>
        </div>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className="tab-button"
          style={tab === "leave" ? { borderBottomColor: THEME_COLOR, color: THEME_COLOR } : undefined}
          onClick={() => setTab("leave")}
        >
          출타현황
        </button>
        <button
          type="button"
          className="tab-button"
          style={tab === "overtime" ? { borderBottomColor: THEME_COLOR, color: THEME_COLOR } : undefined}
          onClick={() => setTab("overtime")}
        >
          특근현황
        </button>
      </div>

      <div className="content">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          singleSelectedDate={selectedDate}
          countByDate={countByDate}
          onDayClick={setSelectedDate}
          themeColor={THEME_COLOR}
        />

        {loading ? (
          <p className="empty-text" style={{ marginTop: 28 }}>
            불러오는 중...
          </p>
        ) : teams.length === 0 ? (
          <p className="empty-text" style={{ marginTop: 28 }}>
            이 공장에 배정된 직장이 없습니다. 최고관리자에게 소속 등록을 요청해주세요.
          </p>
        ) : !selectedDate ? (
          <p className="empty-text" style={{ marginTop: 28 }}>
            달력에서 날짜를 누르면 그날 현황이 여기 나타납니다.
          </p>
        ) : tab === "leave" ? (
          <>
            <div className="section-title-row">
              <div className="section-title" style={{ margin: 0 }}>
                {selectedDate} 출타현황
              </div>
              <button type="button" className="refresh-link" onClick={load}>
                새로고침
              </button>
            </div>

            <div className="leave-table">
              <div className="lt-row lt-head">
                <div className="lt-cell lt-cell-label">직장</div>
                {LEAVE_BUCKETS.map((b) => (
                  <div key={b} className="lt-cell">
                    {b}
                  </div>
                ))}
                <div className="lt-cell">합계</div>
              </div>
              <div className="lt-row lt-total-row">
                <div className="lt-cell-label">총계</div>
                {LEAVE_BUCKETS.map((b) => (
                  <div key={b} className="lt-cell">
                    {leaveTotals[b]}
                  </div>
                ))}
                <div className="lt-cell">{LEAVE_BUCKETS.reduce((sum, b) => sum + leaveTotals[b], 0)}</div>
              </div>
              {teams.map((team) => {
                const counts = leaveTeamCounts[team] ?? emptyBucketCounts();
                const total = LEAVE_BUCKETS.reduce((sum, b) => sum + counts[b], 0);
                return (
                  <div key={team} className="lt-row">
                    <div className="lt-cell-label">{team}</div>
                    {LEAVE_BUCKETS.map((b) => (
                      <div key={b} className="lt-cell">
                        {counts[b]}
                      </div>
                    ))}
                    <div className="lt-cell">{total}</div>
                  </div>
                );
              })}
            </div>

            <div className="section-title">비고 (항목별 신청자)</div>
            <div className="remark-box">
              {LEAVE_BUCKETS.map((b) => (
                <div key={b} className="remark-row">
                  <div className="remark-type">{b}</div>
                  {leaveRemarks[b].length === 0 ? (
                    <p className="remark-none">없음</p>
                  ) : (
                    <div className="remark-chip-row">
                      {leaveRemarks[b].map((e) => (
                        <span key={e.id} className="remark-chip">
                          <span className="team">{e.team}·</span>
                          {e.name} ({e.leaveType})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="section-title-row">
              <div className="section-title" style={{ margin: 0 }}>
                {selectedDate} 특근현황
              </div>
              <button type="button" className="refresh-link" onClick={load}>
                새로고침
              </button>
            </div>

            <div className="ot-table">
              <div className="ot-row ot-head">
                <div className="ot-cell ot-cell-label">직장</div>
                {OVERTIME_BUCKETS.map((b) => (
                  <div key={b} className="ot-cell">
                    {b}
                  </div>
                ))}
                <div className="ot-cell">합계</div>
              </div>
              <div className="ot-row ot-total-row">
                <div className="ot-cell-label">총계</div>
                {OVERTIME_BUCKETS.map((b) => (
                  <div key={b} className="ot-cell">
                    {overtimeTotals[b]}
                  </div>
                ))}
                <div className="ot-cell">{OVERTIME_BUCKETS.reduce((sum, b) => sum + overtimeTotals[b], 0)}</div>
              </div>
              {teams.map((team) => {
                const counts = overtimeTeamCounts[team] ?? emptyOvertimeCounts();
                const total = OVERTIME_BUCKETS.reduce((sum, b) => sum + counts[b], 0);
                return (
                  <div key={team} className="ot-row">
                    <div className="ot-cell-label">{team}</div>
                    {OVERTIME_BUCKETS.map((b) => (
                      <div key={b} className="ot-cell">
                        {counts[b]}
                      </div>
                    ))}
                    <div className="ot-cell">{total}</div>
                  </div>
                );
              })}
            </div>

            <div className="section-title">비고 (조출·야근 인원)</div>
            <div className="remark-box">
              {OVERTIME_BUCKETS.map((b) => (
                <div key={b} className="remark-row">
                  <div className="remark-type remark-type-ot">{b}</div>
                  {overtimeRemarks[b].length === 0 ? (
                    <p className="remark-none">없음</p>
                  ) : (
                    <div className="remark-chip-row">
                      {overtimeRemarks[b].map((e) => (
                        <span key={e.id} className="remark-chip">
                          <span className="team">{e.team}·</span>
                          {e.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
