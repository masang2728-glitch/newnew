import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../session/SessionContext";
import { subscribePendingCount } from "../api/requests";

export default function MainScreen() {
  const { userName, teamName, isAdmin, logout } = useSession();
  const navigate = useNavigate();
  const [pendingVacation, setPendingVacation] = useState(0);
  const [pendingOvertime, setPendingOvertime] = useState(0);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const hasAlertedRef = useRef(false);

  useEffect(() => {
    if (!isAdmin || !teamName) return;
    const unsubVacation = subscribePendingCount(teamName, "vacation", setPendingVacation);
    const unsubOvertime = subscribePendingCount(teamName, "overtime", setPendingOvertime);
    return () => {
      unsubVacation();
      unsubOvertime();
    };
  }, [isAdmin, teamName]);

  useEffect(() => {
    if (!isAdmin || hasAlertedRef.current) return;
    if (pendingVacation + pendingOvertime > 0) {
      setShowPendingModal(true);
      hasAlertedRef.current = true;
    }
  }, [isAdmin, pendingVacation, pendingOvertime]);

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
        <button type="button" className="main-footer-link" onClick={() => navigate("/app-info")}>
          앱 정보
        </button>
      </div>

      {showPendingModal && (
        <div className="modal-backdrop" onClick={() => setShowPendingModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">확인하지 않은 신청이 있어요</div>
            <p className="empty-text" style={{ marginBottom: 16 }}>
              {[
                pendingVacation > 0 ? `휴가 신청 ${pendingVacation}건` : null,
                pendingOvertime > 0 ? `야근 신청 ${pendingOvertime}건` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              이 아직 확인되지 않았습니다.
            </p>
            {pendingVacation > 0 && (
              <button
                type="button"
                className="modal-option"
                style={{ borderColor: "#2563EB", color: "#2563EB" }}
                onClick={() => navigate("/vacation")}
              >
                휴가 신청 확인하러 가기
              </button>
            )}
            {pendingOvertime > 0 && (
              <button
                type="button"
                className="modal-option"
                style={{ borderColor: "#F97316", color: "#F97316" }}
                onClick={() => navigate("/overtime")}
              >
                야근 신청 확인하러 가기
              </button>
            )}
            <button type="button" className="modal-cancel" onClick={() => setShowPendingModal(false)}>
              나중에 확인할게요
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
