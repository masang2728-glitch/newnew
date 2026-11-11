import { useNavigate } from "react-router-dom";
import { useSession } from "../session/SessionContext";
import { BottomNav, JbScreen, ScreenTop } from "../components/JbLayout";

// 아래 메뉴 "더보기": 메인에서 빠진 기존 화면들로 가는 길.
export default function MoreScreen() {
  const { isAdmin, homeFactory, logout } = useSession();
  const navigate = useNavigate();

  const items: { label: string; onClick: () => void }[] = [
    ...(isAdmin
      ? [
          { label: "직장 대시보드", onClick: () => navigate("/team-dashboard") },
          { label: "사고관리", onClick: () => navigate("/accident-management") },
        ]
      : []),
    ...(homeFactory ? [{ label: "공장 현황 대시보드", onClick: () => navigate("/factory-dashboard") }] : []),
    { label: "조직도", onClick: () => navigate("/team-members") },
    { label: "직장 승인 대기", onClick: () => navigate("/pending") },
    { label: "앱 정보 · 요청사항", onClick: () => navigate("/app-info") },
    {
      label: "다른 이름/팀으로 전환",
      onClick: () => {
        logout();
        navigate("/", { replace: true });
      },
    },
  ];

  return (
    <JbScreen>
      <ScreenTop title="더보기" />
      <div className="jb-body">
        <section className="jb-box">
          {items.map((item) => (
            <button key={item.label} type="button" className="jb-more" onClick={item.onClick}>
              {item.label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </section>
      </div>
      <BottomNav />
    </JbScreen>
  );
}
