import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";

export default function NameEntryScreen() {
  const { login, loginSuperAdmin } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [superAdminCode, setSuperAdminCode] = useState("");

  const handleEnter = () => {
    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    if (!team.trim()) {
      toast.error("팀명을 입력해주세요.");
      return;
    }
    const result = login(name, team, pin);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    navigate("/main", { replace: true });
  };

  const handleSuperAdminEnter = () => {
    const result = loginSuperAdmin(superAdminCode);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    navigate("/super-admin", { replace: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEnter();
  };

  const onSuperAdminKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSuperAdminEnter();
  };

  return (
    <div className="entry-screen">
      <div className="entry-card">
        <h1 className="entry-title">휴가/야근 신청 캘린더</h1>
        <p className="entry-subtitle">이름과 팀명을 입력하고 입장해주세요</p>

        <input
          className="entry-input"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />
        <input
          className="entry-input"
          placeholder="팀명 (예: 영업1팀)"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <p className="entry-hint">
          같은 팀원끼리는 팀명을 정확히 동일하게 입력해야 같은 캘린더를 공유합니다.
        </p>

        {showPin ? (
          <input
            className="entry-input"
            placeholder="관리자 암호"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button type="button" className="entry-admin-link" onClick={() => setShowPin(true)}>
            관리자이신가요?
          </button>
        )}

        <button type="button" className="entry-button" onClick={handleEnter}>
          입장
        </button>

        <div className="super-admin-block">
          {showSuperAdmin ? (
            <>
              <input
                className="entry-input"
                placeholder="최고관리자 암호"
                type="password"
                value={superAdminCode}
                onChange={(e) => setSuperAdminCode(e.target.value)}
                onKeyDown={onSuperAdminKeyDown}
              />
              <button type="button" className="entry-button entry-button-secondary" onClick={handleSuperAdminEnter}>
                최고관리자 입장
              </button>
            </>
          ) : (
            <button type="button" className="entry-admin-link" onClick={() => setShowSuperAdmin(true)}>
              최고관리자이신가요?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
