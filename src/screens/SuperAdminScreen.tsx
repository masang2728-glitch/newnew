import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchAppSummary, deleteTeam, type AppSummary } from "../api/admin";
import { fetchAllTeamMembers } from "../api/members";
import { fetchOrgGroups, setTeamFactory } from "../api/orgGroups";
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
  const [factoryByTeam, setFactoryByTeam] = useState<Record<string, string>>({});
  const [factoryDrafts, setFactoryDrafts] = useState<Record<string, string>>({});
  const [savingFactory, setSavingFactory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [newFactory, setNewFactory] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [registeringTeam, setRegisteringTeam] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, allMembers, orgGroups] = await Promise.all([
        fetchAppSummary(),
        fetchAllTeamMembers(),
        fetchOrgGroups(),
      ]);
      setSummary(summaryData);
      const grouped: Record<string, TeamMember[]> = {};
      for (const m of allMembers) {
        if (!grouped[m.team]) grouped[m.team] = [];
        grouped[m.team].push(m);
      }
      setMembersByTeam(grouped);
      const factoryMap: Record<string, string> = {};
      for (const g of orgGroups) factoryMap[g.team] = g.factory;
      setFactoryByTeam(factoryMap);
    } catch {
      toast.error("현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // team_members/org_groups에만 있고(신청 이력이 없어서) summary.teams엔 없는 팀도 목록에서 빠지지 않도록 합친다.
  // (org_groups만 있는 경우는 아직 아무도 로그인하지 않은, 미리 등록만 해둔 직장.)
  const teamNames = useMemo(() => {
    const names = new Set<string>();
    (summary?.teams ?? []).forEach((t) => names.add(t.team));
    Object.keys(membersByTeam).forEach((t) => names.add(t));
    Object.keys(factoryByTeam).forEach((t) => names.add(t));
    return [...names].sort((a, b) => {
      const ta = summary?.teams.find((x) => x.team === a)?.lastActivity ?? 0;
      const tb = summary?.teams.find((x) => x.team === b)?.lastActivity ?? 0;
      return tb - ta;
    });
  }, [summary, membersByTeam, factoryByTeam]);

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

  const handleSaveFactory = async (teamName: string) => {
    const factory = (factoryDrafts[teamName] ?? factoryByTeam[teamName] ?? "").trim();
    if (!factory) {
      toast.error("소속 공장명을 입력해주세요.");
      return;
    }
    setSavingFactory(teamName);
    try {
      await setTeamFactory(teamName, factory);
      setFactoryByTeam((prev) => ({ ...prev, [teamName]: factory }));
      toast.success(`"${teamName}" 팀을 "${factory}" 소속으로 저장했습니다.`);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingFactory(null);
    }
  };

  const handleRegisterTeam = async () => {
    const factory = newFactory.trim();
    const team = newTeam.trim();
    if (!factory || !team) {
      toast.error("공장명과 직장명을 모두 입력해주세요.");
      return;
    }
    setRegisteringTeam(true);
    try {
      await setTeamFactory(team, factory);
      toast.success(`"${factory}" 소속으로 "${team}"을(를) 등록했습니다.`);
      setNewTeam("");
      await load();
    } catch {
      toast.error("등록 중 오류가 발생했습니다.");
    } finally {
      setRegisteringTeam(false);
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
        <div className="section-title" style={{ marginTop: 0 }}>
          새 직장 등록
        </div>
        <p className="empty-text" style={{ marginTop: -8, marginBottom: 4 }}>
          여기서 등록해두면 이름입장 화면의 공장/직장 선택 목록에 바로 나타납니다.
        </p>
        <div className="field-label" style={{ marginTop: 12 }}>
          공장명
        </div>
        <input
          className="text-field"
          placeholder="예: 전차공장"
          value={newFactory}
          onChange={(e) => setNewFactory(e.target.value)}
        />
        <div className="field-label">직장명</div>
        <input
          className="text-field"
          placeholder="예: 전차해체"
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
        />
        <button
          type="button"
          className="submit-button"
          style={{ backgroundColor: "#111827" }}
          disabled={registeringTeam}
          onClick={handleRegisterTeam}
        >
          {registeringTeam ? "등록 중..." : "등록"}
        </button>

        {loading || !summary ? (
          <p className="empty-text" style={{ marginTop: 28 }}>
            불러오는 중...
          </p>
        ) : (
          <>
            <div className="section-title">전체 요약</div>
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
                    <div className="factory-assign-row">
                      <input
                        className="text-field"
                        placeholder="소속 공장 (예: 전차공장)"
                        value={factoryDrafts[teamName] ?? factoryByTeam[teamName] ?? ""}
                        onChange={(e) =>
                          setFactoryDrafts((prev) => ({ ...prev, [teamName]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="inline-edit-link"
                        disabled={savingFactory === teamName}
                        onClick={() => handleSaveFactory(teamName)}
                      >
                        {savingFactory === teamName ? "저장 중..." : "저장"}
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
