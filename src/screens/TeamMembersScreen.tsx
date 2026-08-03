import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToMembers } from "../api/members";
import type { TeamMember } from "../types";

export default function TeamMembersScreen() {
  const { userName, teamName } = useSession();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="request-screen">
      <div className="request-header" style={{ backgroundColor: "#0f766e" }}>
        <div className="request-header-row">
          <div>
            <h1 className="request-title">{teamName} 팀원 현황</h1>
            <div className="request-user">{userName}님</div>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
