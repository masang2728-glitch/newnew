import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToMembers, deleteMember } from "../api/members";
import type { TeamMember } from "../types";

export default function TeamMembersScreen() {
  const { userName, teamName, isAdmin } = useSession();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  useEffect(() => {
    if (!teamName) return;
    const unsubscribe = subscribeToMembers(
      teamName,
      (list) => {
        setMembers(list);
        setLoading(false);
      },
      () => {
        toast.error("팀원 현황을 불러오지 못했습니다.");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [teamName]);

  const handleDelete = async (member: TeamMember) => {
    if (!teamName) return;
    if (!window.confirm(`${member.name}님을 팀원 명단에서 삭제할까요?`)) return;
    setDeletingName(member.name);
    try {
      await deleteMember(teamName, member.name);
      toast.success(`${member.name}님을 삭제했습니다.`);
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingName(null);
    }
  };

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: "#0f766e" }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">{teamName} 팀원 현황</h1>
            <div className="request-user">
              {userName}님{isAdmin ? " · 관리자" : ""}
            </div>
          </div>
          <button type="button" className="request-back" onClick={() => navigate("/main")}>
            메인으로 돌아가기 ›
          </button>
        </div>
      </div>

      <div className="content">
        <div className="stat-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="stat-card">
            <div className="stat-value">{members.length}</div>
            <div className="stat-label">총원</div>
          </div>
        </div>

        <div className="section-title">팀원 명단</div>
        {loading ? (
          <p className="empty-text">불러오는 중...</p>
        ) : members.length === 0 ? (
          <p className="empty-text">아직 등록된 팀원이 없습니다.</p>
        ) : (
          members.map((m) => (
            <div key={`${m.orderNo}-${m.name}`} className="team-row">
              <div className="team-row-main">
                <div className="team-row-name">
                  {m.orderNo}. {m.name}
                  {m.name === userName ? " (나)" : ""}
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="cancel-link"
                  disabled={deletingName === m.name}
                  onClick={() => handleDelete(m)}
                >
                  {deletingName === m.name ? "삭제 중..." : "삭제"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
