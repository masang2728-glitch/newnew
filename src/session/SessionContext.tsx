import React, { createContext, useContext, useEffect, useState } from "react";
import { ADMIN_PIN, SUPER_ADMIN_PIN } from "../constants";

const NAME_KEY = "session:userName";
const TEAM_KEY = "session:teamName";
const ORDER_KEY = "session:orderNo";
const ADMIN_KEY = "session:isAdmin";
const SUPER_ADMIN_KEY = "session:isSuperAdmin";
const HOME_FACTORY_KEY = "session:homeFactory";

interface SessionContextValue {
  userName: string | null;
  teamName: string | null;
  orderNo: number | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // "본부" 직장으로 일반 로그인한 사람이 소속된 공장. 평소 팀 화면은 그대로 쓰면서
  // 공장 대시보드에도 별도 PIN 없이 추가로 접근할 수 있게 해준다.
  homeFactory: string | null;
  isLoading: boolean;
  login: (
    name: string,
    orderNo: number,
    team: string,
    pin: string,
    homeFactory?: string
  ) => { ok: true } | { ok: false; error: string };
  loginSuperAdmin: (code: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [homeFactory, setHomeFactory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUserName(localStorage.getItem(NAME_KEY));
    setTeamName(localStorage.getItem(TEAM_KEY));
    const storedOrder = localStorage.getItem(ORDER_KEY);
    setOrderNo(storedOrder ? Number(storedOrder) : null);
    setIsAdmin(localStorage.getItem(ADMIN_KEY) === "true");
    setIsSuperAdmin(localStorage.getItem(SUPER_ADMIN_KEY) === "true");
    setHomeFactory(localStorage.getItem(HOME_FACTORY_KEY));
    setIsLoading(false);
  }, []);

  const login = (name: string, orderNo: number, team: string, pin: string, homeFactory?: string) => {
    const trimmedName = name.trim();
    const trimmedTeam = team.trim();
    const trimmedPin = pin.trim();

    if (trimmedPin.length > 0 && trimmedPin !== ADMIN_PIN) {
      return { ok: false as const, error: "관리자 암호가 올바르지 않습니다." };
    }
    const admin = trimmedPin.length > 0 && trimmedPin === ADMIN_PIN;

    localStorage.setItem(NAME_KEY, trimmedName);
    localStorage.setItem(TEAM_KEY, trimmedTeam);
    localStorage.setItem(ORDER_KEY, String(orderNo));
    localStorage.setItem(ADMIN_KEY, admin ? "true" : "false");
    if (homeFactory) localStorage.setItem(HOME_FACTORY_KEY, homeFactory);
    else localStorage.removeItem(HOME_FACTORY_KEY);
    setUserName(trimmedName);
    setTeamName(trimmedTeam);
    setOrderNo(orderNo);
    setIsAdmin(admin);
    setHomeFactory(homeFactory ?? null);
    return { ok: true as const };
  };

  const loginSuperAdmin = (code: string) => {
    if (code.trim() !== SUPER_ADMIN_PIN) {
      return { ok: false as const, error: "최고관리자 암호가 올바르지 않습니다." };
    }
    localStorage.setItem(SUPER_ADMIN_KEY, "true");
    setIsSuperAdmin(true);
    return { ok: true as const };
  };

  const logout = () => {
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(TEAM_KEY);
    localStorage.removeItem(ORDER_KEY);
    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(SUPER_ADMIN_KEY);
    localStorage.removeItem(HOME_FACTORY_KEY);
    setUserName(null);
    setTeamName(null);
    setOrderNo(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setHomeFactory(null);
  };

  return (
    <SessionContext.Provider
      value={{
        userName,
        teamName,
        orderNo,
        isAdmin,
        isSuperAdmin,
        homeFactory,
        isLoading,
        login,
        loginSuperAdmin,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
