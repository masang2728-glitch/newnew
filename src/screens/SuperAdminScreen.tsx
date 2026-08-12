import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchAppSummary, deleteTeam, type AppSummary } from "../api/admin";
import { fetchAllTeamMembers } from "../api/members";
import type { TeamMember } from "../types";

function formatDate(ms: number): string {
  if (!ms) return "-";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SuperAdminScreen() {
  const { logout } = useSession();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AppSummary | null>(null);
  const [membersByTeam, setMembersByTeam] = useState<Record<string, TeamMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, allMembers] = await Promise.all([fetchAppSummary(), fetchAllTeamMembers()]);
      setSummary(summaryData);
      const grouped: Record<string, TeamMember[]> = {};
      for (const m of allMembers) {
        if (!grouped[m.team]) grouped[m.team] = [];
        grouped[m.team].push(m);
      }
      setMembersByTeam(grouped);
    } catch {
      toast.error("현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // team_members에만 있고(신청 이력이 없어서) summary.teams엔 없는 팀도 목록에서 빠지지 않도록 합친다.
  const teamNames = useMemo(() => {
    const names = new Set<string>();
    (summary?.teams ?? []).forEach((t) => names.add(t.team));
    Object.keys(membersByTeam).forEach((t) => names.add(t));
    return [...names].sort((a, b) => {
      const ta = summary?.teams.find((x) => x.team === a)?.lastActivity ?? 0;
      const tb = summary?.teams.find((x) => x.team === b)?.lastActivity ?? 0;
      return tb - ta;
    });
  }, [summary, membersByTeam]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (team: string) => {
    if (!window.confirm(`"${team}" 팀의 모든 휴가/야근 신청 데이터를 영구 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletingTeam(team);
    try {
      await deleteTeam(team);
      toast.success(`"${team}" 팀 데이터를 삭제했습니다.`);
      await load();
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingTeam(null);
    }
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
            <h1 className="request-title">최고관리자 대시보드</h1>
            <div className="request-user">앱 전체 팀/이용 현황</div>
          </div>
          <button type="button" className="request-back" onClick={handleExit}>
            나가기 ›
          </button>
        </div>
      </div>

      <div className="content">
        {loading || !summary ? (
          <p className="empty-text">불러오는 중...</p>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value">{teamNames.length}</div>
                <div className="stat-label">전체 팀 수</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{summary.totalPeople}</div>
                <div className="stat-label">전체 이용 인원</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{summary.totalVacation}</div>
                <div className="stat-label">휴가 신청 건수</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{summary.totalOvertime}</div>
                <div className="stat-label">야근 신청 건수</div>
              </div>
            </div>

            <div className="section-title-row">
              <div className="section-title" style={{ margin: 0 }}>
                팀 목록
              </div>
              <button type="button" className="refresh-link" onClick={load}>
                새로고침
              </button>
            </div>

            {teamNames.length === 0 ? (
              <p className="empty-text">아직 생성된 팀이 없습니다.</p>
            ) : (
              teamNames.map((teamName) => {
                const t = summary.teams.find((x) => x.team === teamName);
                const roster = membersByTeam[teamName] ?? [];
                const isExpanded = expandedTeam === teamName;
                return (
                  <div key={teamName} className="team-row-block">
                    <div className="team-row">
                      <div className="team-row-main">
                        <div className="team-row-name">{teamName}</div>
                        <div className="team-row-meta">
                          이용 {t?.headcount ?? roster.length}명 · 휴가 {t?.vacationCount ?? 0}건 · 야근{" "}
                          {t?.overtimeCount ?? 0}건 · 최근 활동 {formatDate(t?.lastActivity ?? 0)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cancel-link"
                        disabled={deletingTeam === teamName}
                        onClick={() => handleDelete(teamName)}
                      >
                        {deletingTeam === teamName ? "삭제 중..." : "팀 삭제"}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="inline-edit-link"
                      onClick={() => setExpandedTeam(isExpanded ? null : teamName)}
                    >
                      구성원 {roster.length}명 {isExpanded ? "숨기기 ▲" : "보기 ▼"}
                    </button>
                    {isExpanded && (
                      <div className="roster-box">
                        {roster.length === 0 ? (
                          <p className="empty-text">등록된 팀원이 없습니다.</p>
                        ) : (
                          <div className="chip-row">
                            {roster.map((m) => (
                              <span key={`${m.orderNo}-${m.name}`} className="name-chip">
                                {m.orderNo}. {m.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
