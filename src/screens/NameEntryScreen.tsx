import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { upsertMember } from "../api/members";
import { fetchOrgGroups, type OrgGroup } from "../api/orgGroups";

export default function NameEntryScreen() {
  const { login, loginSuperAdmin, loginFactoryAdmin } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [entering, setEntering] = useState(false);

  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [superAdminCode, setSuperAdminCode] = useState("");

  const [showFactoryAdmin, setShowFactoryAdmin] = useState(false);
  const [factoryAdminChoice, setFactoryAdminChoice] = useState("");
  const [factoryCode, setFactoryCode] = useState("");

  // 공장/직장 목록 — 최고관리자가 등록해둔 org_groups에서 불러온다.
  const [orgGroups, setOrgGroups] = useState<OrgGroup[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [factory, setFactory] = useState("");
  const [team, setTeam] = useState("");

  useEffect(() => {
    fetchOrgGroups()
      .then((groups) => {
        setOrgGroups(groups);
        const firstFactory = groups[0]?.factory ?? "";
        setFactory(firstFactory);
        setTeam(groups.find((g) => g.factory === firstFactory)?.team ?? "");
        setFactoryAdminChoice(firstFactory);
      })
      .catch(() => toast.error("공장/직장 목록을 불러오지 못했습니다."))
      .finally(() => setLoadingOrg(false));
  }, []);

  const factoryNames = useMemo(
    () => [...new Set(orgGroups.map((g) => g.factory))].sort(),
    [orgGroups]
  );
  const teamsInFactory = useMemo(
    () => orgGroups.filter((g) => g.factory === factory).map((g) => g.team).sort(),
    [orgGroups, factory]
  );

  const handleFactoryChange = (f: string) => {
    setFactory(f);
    setTeam(orgGroups.find((g) => g.factory === f)?.team ?? "");
  };

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
      toast.error("직장을 선택해주세요.");
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
    const result = loginFactoryAdmin(factoryAdminChoice, factoryCode);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    navigate("/factory-dashboard", { replace: true });
  };

  const onFactoryAdminKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFactoryAdminEnter();
  };

  const noOrgRegistered = !loadingOrg && factoryNames.length === 0;

  return (
    <div className="entry-screen">
      <div className="entry-card">
        <h1 className="entry-title">휴가/야근 신청 캘린더</h1>
        <p className="entry-subtitle">이름, 순번, 소속을 선택하고 입장해주세요</p>

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

        {loadingOrg ? (
          <p className="empty-text">공장/직장 목록을 불러오는 중...</p>
        ) : noOrgRegistered ? (
          <p className="empty-text">
            아직 등록된 공장/직장이 없습니다. 최고관리자에게 등록을 요청해주세요.
          </p>
        ) : (
          <>
            <select
              className="entry-select"
              value={factory}
              onChange={(e) => handleFactoryChange(e.target.value)}
            >
              {factoryNames.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select className="entry-select" value={team} onChange={(e) => setTeam(e.target.value)}>
              {teamsInFactory.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </>
        )}

        <p className="entry-hint">
          공장과 직장을 선택하면 같은 직장 동료와 캘린더를 공유합니다.
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

        <button type="button" className="entry-button" onClick={handleEnter} disabled={entering || noOrgRegistered}>
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
              {noOrgRegistered ? (
                <p className="empty-text">등록된 공장이 없습니다.</p>
              ) : (
                <select
                  className="entry-select"
                  value={factoryAdminChoice}
                  onChange={(e) => setFactoryAdminChoice(e.target.value)}
                  onKeyDown={onFactoryAdminKeyDown}
                >
                  {factoryNames.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}
              <input
                className="entry-input"
                placeholder="공장관리자 암호"
                type="password"
                value={factoryCode}
                onChange={(e) => setFactoryCode(e.target.value)}
                onKeyDown={onFactoryAdminKeyDown}
              />
              <button
                type="button"
                className="entry-button entry-button-secondary"
                onClick={handleFactoryAdminEnter}
                disabled={noOrgRegistered}
              >
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
