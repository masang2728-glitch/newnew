import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { fetchAppSummary, deleteTeam, type AppSummary } from "../api/admin";

function formatDate(ms: number): string {
  if (!ms) return "-";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SuperAdminScreen() {
  const { logout } = useSession();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AppSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppSummary();
      setSummary(data);
    } catch {
      toast.error("현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

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
                <div className="stat-value">{summary.totalTeams}</div>
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

            {summary.teams.length === 0 ? (
              <p className="empty-text">아직 생성된 팀이 없습니다.</p>
            ) : (
              summary.teams.map((t) => (
                <div key={t.team} className="team-row">
                  <div className="team-row-main">
                    <div className="team-row-name">{t.team}</div>
                    <div className="team-row-meta">
                      이용 {t.headcount}명 · 휴가 {t.vacationCount}건 · 야근 {t.overtimeCount}건 · 최근 활동{" "}
                      {formatDate(t.lastActivity)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cancel-link"
                    disabled={deletingTeam === t.team}
                    onClick={() => handleDelete(t.team)}
                  >
                    {deletingTeam === t.team ? "삭제 중..." : "팀 삭제"}
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
