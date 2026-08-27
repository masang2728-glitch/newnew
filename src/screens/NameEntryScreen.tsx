import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { upsertMember } from "../api/members";

export default function NameEntryScreen() {
  const { login, loginSuperAdmin, loginFactoryAdmin } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [team, setTeam] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [entering, setEntering] = useState(false);

  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [superAdminCode, setSuperAdminCode] = useState("");

  const [showFactoryAdmin, setShowFactoryAdmin] = useState(false);
  const [factoryInput, setFactoryInput] = useState("");
  const [factoryCode, setFactoryCode] = useState("");

  const handleEnter = async () => {
    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    const orderNoValue = Number(orderNo.trim());
    if (!orderNo.trim() || !Number.isFinite(orderNoValue)) {
      toast.error("순번을 입력해주세요.");
      return;
    }
    if (!team.trim()) {
      toast.error("팀명을 입력해주세요.");
      return;
    }
    const result = login(name, orderNoValue, team, pin);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEntering(true);
    try {
      await upsertMember(team.trim(), name.trim(), orderNoValue);
    } catch {
      toast.error("팀원 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setEntering(false);
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

  const handleFactoryAdminEnter = () => {
    const result = loginFactoryAdmin(factoryInput, factoryCode);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    navigate("/factory-dashboard", { replace: true });
  };

  const onFactoryAdminKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFactoryAdminEnter();
  };

  return (
    <div className="entry-screen">
      <div className="entry-card">
        <h1 className="entry-title">휴가/야근 신청 캘린더</h1>
        <p className="entry-subtitle">이름, 순번, 팀명을 입력하고 입장해주세요</p>

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
          placeholder="순번"
          type="number"
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          onKeyDown={onKeyDown}
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

        <button type="button" className="entry-button" onClick={handleEnter} disabled={entering}>
          {entering ? "입장 중..." : "입장"}
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

        <div className="super-admin-block">
          {showFactoryAdmin ? (
            <>
              <input
                className="entry-input"
                placeholder="공장명 (예: 전차공장)"
                value={factoryInput}
                onChange={(e) => setFactoryInput(e.target.value)}
                onKeyDown={onFactoryAdminKeyDown}
              />
              <input
                className="entry-input"
                placeholder="공장관리자 암호"
                type="password"
                value={factoryCode}
                onChange={(e) => setFactoryCode(e.target.value)}
                onKeyDown={onFactoryAdminKeyDown}
              />
              <button type="button" className="entry-button entry-button-secondary" onClick={handleFactoryAdminEnter}>
                공장관리자 입장
              </button>
            </>
          ) : (
            <button type="button" className="entry-admin-link" onClick={() => setShowFactoryAdmin(true)}>
              공장관리자이신가요?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
