import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchOrgGroups } from "../api/orgGroups";
import { fetchRequestsForTeams } from "../api/requests";
import type { RequestEntry } from "../types";
import { todayString } from "../dateUtils";

const THEME_COLOR = "#0f766e";

export default function FactoryDashboardScreen() {
  const { factoryName, logout } = useSession();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<string[]>([]);
  const [vacationEntries, setVacationEntries] = useState<RequestEntry[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<RequestEntry[]>([]);
  const [month, setMonth] = useState(todayString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!factoryName) return;
    setLoading(true);
    try {
      const groups = await fetchOrgGroups();
      const myTeams = groups.filter((g) => g.factory === factoryName).map((g) => g.team);
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
  }, [factoryName]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-");
    return `${y}년 ${Number(m)}월`;
  }, [month]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthlyVacation = useMemo(
    () => vacationEntries.filter((e) => e.date.startsWith(month) && e.confirmedAt),
    [vacationEntries, month]
  );
  const monthlyOvertime = useMemo(
    () => overtimeEntries.filter((e) => e.date.startsWith(month)),
    [overtimeEntries, month]
  );

  const byTeam = useMemo(() => {
    const map: Record<string, { vacation: RequestEntry[]; overtime: RequestEntry[] }> = {};
    for (const t of teams) map[t] = { vacation: [], overtime: [] };
    for (const e of monthlyVacation) {
      if (!map[e.team]) map[e.team] = { vacation: [], overtime: [] };
      map[e.team].vacation.push(e);
    }
    for (const e of monthlyOvertime) {
      if (!map[e.team]) map[e.team] = { vacation: [], overtime: [] };
      map[e.team].overtime.push(e);
    }
    return map;
  }, [teams, monthlyVacation, monthlyOvertime]);

  const handleExit = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: THEME_COLOR }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">{factoryName} 현황 대시보드</h1>
            <div className="request-user">소속 직장 {teams.length}곳</div>
          </div>
          <button type="button" className="request-back" onClick={handleExit}>
            나가기 ›
          </button>
        </div>
      </div>

      <div className="content">
        <div className="calendar-header">
          <button type="button" className="calendar-nav" onClick={() => shiftMonth(-1)} aria-label="이전 달">
            ‹
          </button>
          <div className="calendar-title">{monthLabel}</div>
          <button type="button" className="calendar-nav" onClick={() => shiftMonth(1)} aria-label="다음 달">
            ›
          </button>
        </div>

        <div className="section-title-row">
          <div className="section-title" style={{ margin: 0 }}>
            전체 요약
          </div>
          <button type="button" className="refresh-link" onClick={load}>
            새로고침
          </button>
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="stat-card">
            <div className="stat-value">{monthlyVacation.length}</div>
            <div className="stat-label">휴가 신청 (확인완료)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{monthlyOvertime.length}</div>
            <div className="stat-label">야근 신청</div>
          </div>
        </div>

        <div className="section-title">직장별 현황</div>
        {loading ? (
          <p className="empty-text">불러오는 중...</p>
        ) : teams.length === 0 ? (
          <p className="empty-text">
            이 공장에 배정된 직장이 없습니다. 최고관리자에게 소속 등록을 요청해주세요.
          </p>
        ) : (
          teams.map((team) => {
            const data = byTeam[team] ?? { vacation: [], overtime: [] };
            return (
              <div key={team} className="team-row-block">
                <div className="team-row">
                  <div className="team-row-main">
                    <div className="team-row-name">{team}</div>
                    <div className="team-row-meta">
                      휴가 {data.vacation.length}건 · 야근 {data.overtime.length}건
                    </div>
                  </div>
                </div>
                {data.vacation.length > 0 && (
                  <div className="chip-row">
                    {data.vacation.map((e) => (
                      <span key={e.id} className="name-chip">
                        {e.name} · {e.date} · {e.leaveType}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
