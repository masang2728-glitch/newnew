import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchOrgGroups } from "../api/orgGroups";
import { fetchRequestsForTeams } from "../api/requests";
import { fetchMembersForTeams } from "../api/members";
import { fetchIncidentsForTeams } from "../api/incidents";
import type { RequestEntry, IncidentRecord } from "../types";
import { todayString } from "../dateUtils";
import MonthCalendar from "../components/MonthCalendar";
import {
  REPORT_COLUMNS,
  buildReportRows,
  totalReportRow,
  confirmedLeaveCountByDate,
  incidentActiveOnDate,
  leaveColumnOf,
  type ReportColumn,
} from "../reportTable";
import { sortTeams, displayTeamName } from "../teamDisplay";

const THEME_COLOR = "#0f766e";

type OvertimeBucket = "조출" | "야근";
const OVERTIME_BUCKETS: OvertimeBucket[] = ["조출", "야근"];

function emptyOvertimeCounts(): Record<OvertimeBucket, number> {
  return { 조출: 0, 야근: 0 };
}

type DashboardTab = "leave" | "overtime";

export default function FactoryDashboardScreen() {
  const { homeFactory: activeFactory } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DashboardTab>("leave");
  const [teams, setTeams] = useState<string[]>([]);
  const [vacationEntries, setVacationEntries] = useState<RequestEntry[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<RequestEntry[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
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
      const [vac, ot, inc, members] = await Promise.all([
        fetchRequestsForTeams("vacation", myTeams),
        fetchRequestsForTeams("overtime", myTeams),
        fetchIncidentsForTeams(myTeams),
        fetchMembersForTeams(myTeams),
      ]);
      setVacationEntries(vac);
      setOvertimeEntries(ot);
      setIncidents(inc);
      const counts: Record<string, number> = {};
      for (const m of members) counts[m.team] = (counts[m.team] ?? 0) + 1;
      setMemberCounts(counts);
    } catch {
      toast.error("현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeFactory]);

  const overtimeEntriesByDate = useMemo(() => {
    const map: Record<string, RequestEntry[]> = {};
    for (const e of overtimeEntries) {
      if (!e.confirmedAt) continue;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [overtimeEntries]);

  // 캘린더 배지: 인원현황 탭은 확인된 휴가 신청 인원만 센다 (사고관리 등록 인원은 표에만 집계되고
  // 달력에는 표시되지 않는다). 특근현황 탭은 기존 그대로 조출/야근 신청 인원 수.
  const leaveCountByDate = useMemo(() => confirmedLeaveCountByDate(vacationEntries), [vacationEntries]);
  const overtimeCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of Object.keys(overtimeEntriesByDate)) {
      map[d] = new Set(overtimeEntriesByDate[d].map((e) => e.name)).size;
    }
    return map;
  }, [overtimeEntriesByDate]);
  const countByDate = tab === "leave" ? leaveCountByDate : overtimeCountByDate;

  const selectedOvertimeEntries = useMemo(
    () => (selectedDate ? (overtimeEntriesByDate[selectedDate] ?? []) : []),
    [selectedDate, overtimeEntriesByDate]
  );

  const reportRows = useMemo(
    () =>
      selectedDate
        ? buildReportRows(teams, selectedDate, vacationEntries, incidents, memberCounts)
        : [],
    [teams, selectedDate, vacationEntries, incidents, memberCounts]
  );
  const reportTotal = useMemo(() => totalReportRow(reportRows), [reportRows]);

  // 표 아래 "비고": 사진 속 표의 비고 칸(직장별 한 줄)은 빼고, 대신 항목별로 오늘 해당하는
  // 사람 이름을 모아서 보여준다 (관리자가 표만 보고는 알 수 없는 "누구인지"를 확인할 수 있게).
  const remarksByColumn = useMemo(() => {
    const map: Record<ReportColumn, string[]> = {
      휴가: [],
      청원휴가: [],
      병가: [],
      공가: [],
      출장: [],
      교육: [],
      휴직: [],
      공로: [],
      파견: [],
      기타: [],
    };
    if (!selectedDate) return map;
    for (const e of vacationEntries) {
      if (e.date !== selectedDate || !e.confirmedAt) continue;
      const col = leaveColumnOf(e);
      if (col) map[col].push(`${displayTeamName(e.team)}·${e.name} (${e.leaveType})`);
    }
    for (const r of incidents) {
      if (!incidentActiveOnDate(r, selectedDate)) continue;
      map[r.type].push(`${displayTeamName(r.team)}·${r.name}`);
    }
    return map;
  }, [selectedDate, vacationEntries, incidents]);

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
          인원현황
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
                {selectedDate} 사고현황
              </div>
              <button type="button" className="refresh-link" onClick={load}>
                새로고침
              </button>
            </div>

            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th rowSpan={2}>구분</th>
                    <th rowSpan={2}>총원</th>
                    <th rowSpan={2}>사고</th>
                    <th rowSpan={2}>현재원</th>
                    <th className="rt-group-head" colSpan={REPORT_COLUMNS.length}>
                      사고 내용
                    </th>
                  </tr>
                  <tr>
                    {REPORT_COLUMNS.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="rt-total-row">
                    <td className="rt-label">{reportTotal.team}</td>
                    <td>{reportTotal.total}</td>
                    <td>{reportTotal.accident}</td>
                    <td>{reportTotal.current}</td>
                    {REPORT_COLUMNS.map((c) => (
                      <td key={c}>{reportTotal.counts[c]}</td>
                    ))}
                  </tr>
                  {reportRows.map((row) => (
                    <tr key={row.team}>
                      <td className="rt-label">{displayTeamName(row.team)}</td>
                      <td>{row.total}</td>
                      <td>{row.accident}</td>
                      <td>{row.current}</td>
                      {REPORT_COLUMNS.map((c) => (
                        <td key={c}>{row.counts[c]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="section-title">비고 (항목별 명단)</div>
            <div className="remark-box">
              {REPORT_COLUMNS.map((c) => (
                <div key={c} className="remark-row">
                  <div className="remark-type">{c}</div>
                  {remarksByColumn[c].length === 0 ? (
                    <p className="remark-none">없음</p>
                  ) : (
                    <div className="remark-chip-row">
                      {remarksByColumn[c].map((label, i) => (
                        <span key={`${c}-${i}`} className="remark-chip">
                          {label}
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
                    <div className="ot-cell-label">{displayTeamName(team)}</div>
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
                          <span className="team">{displayTeamName(e.team)}·</span>
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
