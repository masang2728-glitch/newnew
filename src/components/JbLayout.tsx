import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// 장비단 리디자인 공통 부품: 아래 메뉴줄(홈/캘린더/신청내역/더보기)과 하위 화면 머리줄.

const NAV = [
  {
    to: "/main",
    label: "홈",
    icon: <path d="M3 11l9-8 9 8v10h-6v-7H9v7H3z" fill="currentColor" stroke="none" />,
  },
  {
    to: "/calendar",
    label: "캘린더",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  { to: "/vacation", label: "신청내역", icon: <path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" /> },
  {
    to: "/more",
    label: "더보기",
    icon: (
      <g fill="currentColor" stroke="none">
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </g>
    ),
  },
];

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav className="jb-nav" aria-label="아래 메뉴">
      {NAV.map((item) => {
        const active = pathname === item.to;
        return (
          <button
            key={item.to}
            type="button"
            className={`jb-nav-item${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => navigate(item.to)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {item.icon}
            </svg>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

// 하위 화면 머리줄: ‹ 제목 (+ 선택 탭)
export function ScreenTop({
  title,
  tabs,
  activeTab,
  onTab,
}: {
  title: string;
  tabs?: string[];
  activeTab?: number;
  onTab?: (index: number) => void;
}) {
  const navigate = useNavigate();
  return (
    <header className="jb-top">
      <div className="jb-top-row">
        <button type="button" className="jb-back" aria-label="메인으로" onClick={() => navigate("/main")}>
          ‹
        </button>
        <h1>{title}</h1>
      </div>
      {tabs && (
        <div className="jb-tabs" role="tablist">
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={i === activeTab}
              className={i === activeTab ? "active" : ""}
              onClick={() => onTab?.(i)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

export function JbScreen({ children }: { children: ReactNode }) {
  return <div className="jb-screen">{children}</div>;
}
