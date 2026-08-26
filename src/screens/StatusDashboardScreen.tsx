import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchAllTeamMembers } from "../api/members";
import { fetchVacationRequestsByDate } from "../api/requests";
import type { TeamMember, RequestEntry } from "../types";
import {
  VACATION_CATEGORIES,
  type VacationCategory,
  LEAVE_SUBTYPES,
  WORK_REST_SUBTYPES,
  type VacationType,
} from "../constants";
import { todayString } from "../dateUtils";

function resolveCategory(leaveType: VacationType | undefined): VacationCategory | null {
  if (!leaveType) return null;
  if ((LEAVE_SUBTYPES as readonly string[]).includes(leaveType)) return "연가";
  if ((WORK_REST_SUBTYPES as readonly string[]).includes(leaveType)) return "근무휴식";
  if (leaveType === "공가" || leaveType === "청원" || leaveType === "기타") return leaveType;
  return null;
}

function emptyCategoryMap(): Record<VacationCategory, string[]> {
  const map = {} as Record<VacationCategory, string[]>;
  for (const cat of VACATION_CATEGORIES) map[cat] = [];
  return map;
}

interface TeamRow {
  team: string;
  total: number;
  out: number;
  present: number;
  byCategory: Record<VacationCategory, string[]>;
}

export default function StatusDashboardScreen() {
  const { logout } = useSession();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [requests, setRequests] = useState<RequestEntry[]>([]);
  const [date, setDate] = useState(todayString());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const teamsInitializedRef = useRef(false);

  const loadMembers = async () => {
    try {
      const data = await fetchAllTeamMembers();
      setMembers(data);
      if (!teamsInitializedRef.current) {
        setSelectedTeams(new Set(data.map((m) => m.team)));
        teamsInitializedRef.current = true;
      }
    } catch {
      toast.error("팀원 명단을 불러오지 못했습니다.");
    }
  };

  const loadRequests = async (targetDate: string) => {
    setLoading(true);
    try {
      const data = await fetchVacationRequestsByDate(targetDate);
      setRequests(data);
    } catch {
      toast.error("휴가 현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    loadRequests(date);
  }, [date]);

  const teamNames = useMemo(() => {
    const names = new Set<string>();
    for (const m of members) names.add(m.team);
    return [...names].sort();
  }, [members]);

  const membersByTeam = useMemo(() => {
    const map: Record<string, TeamMember[]> = {};
    for (const m of members) {
      if (!map[m.team]) map[m.team] = [];
      map[m.team].push(m);
    }
    return map;
  }, [members]);

  const rows: TeamRow[] = useMemo(() => {
    const confirmed = requests.filter((r) => r.confirmedAt);
    return teamNames
      .filter((t) => selectedTeams.has(t))
      .map((team) => {
        const teamRequests = confirmed.filter((r) => r.team === team);
        const total = membersByTeam[team]?.length ?? 0;
        const uniqueOut = new Set(teamRequests.map((r) => r.name));
        const byCategory = emptyCategoryMap();
        for (const r of teamRequests) {
          const cat = resolveCategory(r.leaveType);
          if (cat) byCategory[cat].push(r.name);
        }
        return { team, total, out: uniqueOut.size, present: total - uniqueOut.size, byCategory };
      });
  }, [teamNames, selectedTeams, requests, membersByTeam]);

  const totals = useMemo(() => {
    const t: TeamRow = { team: "총계", total: 0, out: 0, present: 0, byCategory: emptyCategoryMap() };
    for (const row of rows) {
      t.total += row.total;
      t.out += row.out;
      t.present += row.present;
      for (const cat of VACATION_CATEGORIES) t.byCategory[cat].push(...row.byCategory[cat]);
    }
    return t;
  }, [rows]);

  const remarksByCategory = useMemo(() => {
    const map = emptyCategoryMap();
    for (const row of rows) {
      for (const cat of VACATION_CATEGORIES) {
        for (const name of row.byCategory[cat]) map[cat].push(`${name}(${row.team})`);
      }
    }
    return map;
  }, [rows]);

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  };

  const handleExit = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: "#111827" }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">전체 현황 대시보드</h1>
            <div className="request-user">그룹별 휴가 현황 요약</div>
          </div>
          <button type="button" className="request-back" onClick={handleExit}>
            나가기 ›
          </button>
        </div>
      </div>

      <div className="content">
        <div className="field-label" style={{ marginTop: 0 }}>
          조회 날짜
        </div>
        <input className="text-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="section-title-row">
          <div className="section-title" style={{ margin: 0 }}>
            표시할 그룹 선택
          </div>
          <button type="button" className="refresh-link" onClick={() => loadRequests(date)}>
            새로고침
          </button>
        </div>

        {teamNames.length === 0 ? (
          <p className="empty-text">등록된 그룹이 없습니다.</p>
        ) : (
          <div className="chip-row">
            {teamNames.map((team) => (
              <button
                key={team}
                type="button"
                className="option-chip"
                style={
                  selectedTeams.has(team)
                    ? { backgroundColor: "#111827", borderColor: "#111827", color: "#fff" }
                    : undefined
                }
                onClick={() => toggleTeam(team)}
              >
                {team}
              </button>
            ))}
          </div>
        )}

        <div className="section-title">{date} 현황표</div>
        {loading ? (
          <p className="empty-text">불러오는 중...</p>
        ) : rows.length === 0 ? (
          <p className="empty-text">선택된 그룹이 없습니다.</p>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>총원</th>
                  <th>사고</th>
                  <th>현재원</th>
                  {VACATION_CATEGORIES.map((cat) => (
                    <th key={cat}>{cat}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="total-row">
                  <td>총계</td>
                  <td>{totals.total}</td>
                  <td>{totals.out}</td>
                  <td>{totals.present}</td>
                  {VACATION_CATEGORIES.map((cat) => (
                    <td key={cat}>{totals.byCategory[cat].length}</td>
                  ))}
                </tr>
                {rows.map((row) => (
                  <tr key={row.team}>
                    <td>{row.team}</td>
                    <td>{row.total}</td>
                    <td>{row.out}</td>
                    <td>{row.present}</td>
                    {VACATION_CATEGORIES.map((cat) => (
                      <td key={cat}>{row.byCategory[cat].length}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="section-title">비고</div>
        {VACATION_CATEGORIES.every((cat) => remarksByCategory[cat].length === 0) ? (
          <p className="empty-text">해당 날짜에 확인된 휴가 신청이 없습니다.</p>
        ) : (
          VACATION_CATEGORIES.map((cat) =>
            remarksByCategory[cat].length === 0 ? null : (
              <div key={cat} style={{ marginBottom: 10 }}>
                <div className="remark-label">{cat}</div>
                <div className="chip-row" style={{ marginTop: 0 }}>
                  {remarksByCategory[cat].map((label, i) => (
                    <span key={`${cat}-${i}`} className="name-chip">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
