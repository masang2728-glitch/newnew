import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchRequestsForTeams } from "../api/requests";
import { fetchMembersForTeams } from "../api/members";
import { fetchIncidentsForTeams } from "../api/incidents";
import type { RequestEntry, IncidentRecord } from "../types";
import { todayString } from "../dateUtils";
import MonthCalendar from "../components/MonthCalendar";
import {
  REPORT_COLUMNS,
  buildReportRows,
  confirmedLeaveCountByDate,
  incidentActiveOnDate,
  leaveColumnOf,
  type ReportColumn,
} from "../reportTable";
import { displayTeamName } from "../teamDisplay";

const THEME_COLOR = "#0f766e";

export default function TeamDashboardScreen() {
  const { teamName } = useSession();
  const navigate = useNavigate();
  const [vacationEntries, setVacationEntries] = useState<RequestEntry[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [month, setMonth] = useState(todayString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(todayString());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!teamName) return;
    setLoading(true);
    try {
      const [vac, inc, members] = await Promise.all([
        fetchRequestsForTeams("vacation", [teamName]),
        fetchIncidentsForTeams([teamName]),
        fetchMembersForTeams([teamName]),
      ]);
      setVacationEntries(vac);
      setIncidents(inc);
      setMemberCount(members.length);
    } catch {
      toast.error("현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [teamName]);

  // 캘린더 배지: 확인된 휴가 신청 인원만 센다 (사고관리 등록 인원은 표에만 매일 집계되고
  // 달력에는 표시되지 않는다).
  const countByDate = useMemo(() => confirmedLeaveCountByDate(vacationEntries), [vacationEntries]);

  const reportRow = useMemo(() => {
    if (!selectedDate || !teamName) return null;
    return buildReportRows([teamName], selectedDate, vacationEntries, incidents, { [teamName]: memberCount })[0];
  }, [selectedDate, teamName, vacationEntries, incidents, memberCount]);

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
      if (col) map[col].push(`${e.name} (${e.leaveType})`);
    }
    for (const r of incidents) {
      if (!incidentActiveOnDate(r, selectedDate)) continue;
      map[r.type].push(r.name);
    }
    return map;
  }, [selectedDate, vacationEntries, incidents]);

  const handleExit = () => {
    navigate("/main", { replace: true });
  };

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: THEME_COLOR }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">{displayTeamName(teamName ?? "")} 직장 대시보드</h1>
            <div className="request-user">공장 현황 대시보드와 같은 구성 · 우리 직장만</div>
          </div>
          <button type="button" className="request-back" onClick={handleExit}>
            메인으로 ›
          </button>
        </div>
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
        ) : !selectedDate || !reportRow ? (
          <p className="empty-text" style={{ marginTop: 28 }}>
            달력에서 날짜를 누르면 그날 현황이 여기 나타납니다.
          </p>
        ) : (
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
                    <td className="rt-label">{displayTeamName(reportRow.team)}</td>
                    <td>{reportRow.total}</td>
                    <td>{reportRow.accident}</td>
                    <td>{reportRow.current}</td>
                    {REPORT_COLUMNS.map((c) => (
                      <td key={c}>{reportRow.counts[c]}</td>
                    ))}
                  </tr>
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

            <div className="incident-link-row">
              <button type="button" className="incident-link" onClick={() => navigate("/accident-management")}>
                사고관리 (출장·교육·휴직·공로·파견)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
