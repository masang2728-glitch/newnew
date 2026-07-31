import { useNavigate } from "react-router-dom";
import { useSession } from "../session/SessionContext";

export default function MainScreen() {
  const { userName, teamName, isAdmin, logout } = useSession();
  const navigate = useNavigate();

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
        <span className="banner-emoji">🏖️</span>
        <span className="banner-title">휴가 신청</span>
        <span className="banner-subtitle">휴가 신청 · 휴가자 캘린더</span>
      </button>

      <button type="button" className="banner banner-overtime" onClick={() => navigate("/overtime")}>
        <span className="banner-emoji">🌙</span>
        <span className="banner-title">야근 신청</span>
        <span className="banner-subtitle">야근 신청 · 야근자 캘린더</span>
      </button>

      <div className="main-footer">
        <button type="button" className="main-footer-link" onClick={() => navigate("/app-info")}>
          앱 정보
        </button>
      </div>
    </div>
  );
}
