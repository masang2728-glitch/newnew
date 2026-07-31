import React, { createContext, useContext, useEffect, useState } from "react";
import { ADMIN_PIN, SUPER_ADMIN_PIN } from "../constants";

const NAME_KEY = "session:userName";
const TEAM_KEY = "session:teamName";
const ADMIN_KEY = "session:isAdmin";
const SUPER_ADMIN_KEY = "session:isSuperAdmin";

interface SessionContextValue {
  userName: string | null;
  teamName: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  login: (name: string, team: string, pin: string) => { ok: true } | { ok: false; error: string };
  loginSuperAdmin: (code: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUserName(localStorage.getItem(NAME_KEY));
    setTeamName(localStorage.getItem(TEAM_KEY));
    setIsAdmin(localStorage.getItem(ADMIN_KEY) === "true");
    setIsSuperAdmin(localStorage.getItem(SUPER_ADMIN_KEY) === "true");
    setIsLoading(false);
  }, []);

  const login = (name: string, team: string, pin: string) => {
    const trimmedName = name.trim();
    const trimmedTeam = team.trim();
    const trimmedPin = pin.trim();

    if (trimmedPin.length > 0 && trimmedPin !== ADMIN_PIN) {
      return { ok: false as const, error: "관리자 암호가 올바르지 않습니다." };
    }
    const admin = trimmedPin.length > 0 && trimmedPin === ADMIN_PIN;

    localStorage.setItem(NAME_KEY, trimmedName);
    localStorage.setItem(TEAM_KEY, trimmedTeam);
    localStorage.setItem(ADMIN_KEY, admin ? "true" : "false");
    setUserName(trimmedName);
    setTeamName(trimmedTeam);
    setIsAdmin(admin);
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
    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(SUPER_ADMIN_KEY);
    setUserName(null);
    setTeamName(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
  };

  return (
    <SessionContext.Provider
      value={{ userName, teamName, isAdmin, isSuperAdmin, isLoading, login, loginSuperAdmin, logout }}
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
