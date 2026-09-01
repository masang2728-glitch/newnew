import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../session/SessionContext";
import { subscribePendingCount } from "../api/requests";

export default function MainScreen() {
  const { userName, teamName, isAdmin, homeFactory, logout } = useSession();
  const navigate = useNavigate();
  const [pendingVacation, setPendingVacation] = useState(0);
  const [pendingOvertime, setPendingOvertime] = useState(0);

  useEffect(() => {
    if (!isAdmin || !teamName) return;
    const unsubVacation = subscribePendingCount(teamName, "vacation", setPendingVacation);
    const unsubOvertime = subscribePendingCount(teamName, "overtime", setPendingOvertime);
    return () => {
      unsubVacation();
      unsubOvertime();
    };
  }, [isAdmin, teamName]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="main-screen">
      <div className="main-header">
        <div className="main-header-text">
          {teamName} · {userName}님으로 접속 중{isAdmin ? " · 관리자" : ""}
        </div>
        <button type="button" className="main-switch-link" onClick={handleLogout}>
          다른 이름/팀으로 전환
        </button>
      </div>

      <button type="button" className="banner banner-vacation" onClick={() => navigate("/vacation")}>
        {isAdmin && pendingVacation > 0 && (
          <span className="banner-badge">확인 대기 {pendingVacation}건</span>
        )}
        <span className="banner-emoji">🏖️</span>
        <span className="banner-title">휴가 신청</span>
        <span className="banner-subtitle">휴가 신청 · 휴가자 캘린더</span>
      </button>

      <button type="button" className="banner banner-overtime" onClick={() => navigate("/overtime")}>
        {isAdmin && pendingOvertime > 0 && (
          <span className="banner-badge">확인 대기 {pendingOvertime}건</span>
        )}
        <span className="banner-emoji">🌙</span>
        <span className="banner-title">야근 신청</span>
        <span className="banner-subtitle">야근 신청 · 야근자 캘린더</span>
      </button>

      <div className="main-footer">
        <button type="button" className="main-footer-link" onClick={() => navigate("/team-members")}>
          팀원 현황
        </button>
        {homeFactory && (
          <button
            type="button"
            className="main-footer-link main-footer-link-hq"
            onClick={() => navigate("/factory-dashboard")}
          >
            공장 현황 대시보드
          </button>
        )}
        <button type="button" className="main-footer-link" onClick={() => navigate("/app-info")}>
          앱 정보
        </button>
      </div>
    </div>
  );
}
