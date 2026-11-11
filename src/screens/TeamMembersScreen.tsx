import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToMembers, deleteMember } from "../api/members";
import { displayTeamName } from "../teamDisplay";
import type { TeamMember } from "../types";
import { BottomNav, JbScreen, ScreenTop } from "../components/JbLayout";

export default function TeamMembersScreen() {
  const { userName, teamName, isAdmin } = useSession();
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

  // 조직도: 선으로 그린 사람 모양을 4열로, 순번 순서대로 (관리자 삭제 기능은 그대로)
  return (
    <JbScreen>
      <ScreenTop title="조직도" />
      <div className="jb-body">
        <div className="jb-org-title">
          {teamName ? displayTeamName(teamName) : ""} · 총원 {members.length}명
        </div>
        {loading ? (
          <p className="jb-empty">불러오는 중...</p>
        ) : members.length === 0 ? (
          <p className="jb-empty">아직 등록된 팀원이 없습니다.</p>
        ) : (
          <div className="jb-org">
            {members.map((m) => (
              <div key={`${m.orderNo}-${m.name}`} className={`jb-person${m.name === userName ? " me" : ""}`}>
                <svg width="44" height="48" viewBox="0 0 44 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="22" cy="13" r="9" />
                  <path d="M6 45c0-11 7-18 16-18s16 7 16 18" />
                </svg>
                <b>{m.name}</b>
                <small>
                  {m.orderNo}번{m.name === userName ? " · 나" : ""}
                </small>
                {isAdmin && (
                  <button
                    type="button"
                    className="jb-person-delete"
                    disabled={deletingName === m.name}
                    onClick={() => handleDelete(m)}
                  >
                    {deletingName === m.name ? "삭제 중" : "삭제"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </JbScreen>
  );
}
