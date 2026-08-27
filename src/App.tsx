import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SessionProvider, useSession } from "./session/SessionContext";
import NameEntryScreen from "./screens/NameEntryScreen";
import MainScreen from "./screens/MainScreen";
import RequestScreen from "./screens/RequestScreen";
import SuperAdminScreen from "./screens/SuperAdminScreen";
import AppInfoScreen from "./screens/AppInfoScreen";
import TeamMembersScreen from "./screens/TeamMembersScreen";
import FactoryDashboardScreen from "./screens/FactoryDashboardScreen";

function RequireSession({ children }: { children: React.ReactNode }) {
  const { userName, teamName, isLoading } = useSession();
  if (isLoading) return null;
  if (!userName || !teamName) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, isLoading } = useSession();
  if (isLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireFactoryAdmin({ children }: { children: React.ReactNode }) {
  const { factoryName, isLoading } = useSession();
  if (isLoading) return null;
  if (!factoryName) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { userName, teamName, isSuperAdmin, factoryName, isLoading } = useSession();
  if (isLoading) return null;
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (factoryName) return <Navigate to="/factory-dashboard" replace />;
  if (userName && teamName) return <Navigate to="/main" replace />;
  return <NameEntryScreen />;
}

function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/main"
            element={
              <RequireSession>
                <MainScreen />
              </RequireSession>
            }
          />
          <Route
            path="/vacation"
            element={
              <RequireSession>
                <RequestScreen type="vacation" title="휴가" themeColor="#2563EB" />
              </RequireSession>
            }
          />
          <Route
            path="/overtime"
            element={
              <RequireSession>
                <RequestScreen type="overtime" title="야근" themeColor="#F97316" />
              </RequireSession>
            }
          />
          <Route
            path="/team-members"
            element={
              <RequireSession>
                <TeamMembersScreen />
              </RequireSession>
            }
          />
          <Route
            path="/app-info"
            element={
              <RequireSession>
                <AppInfoScreen />
              </RequireSession>
            }
          />
          <Route
            path="/super-admin"
            element={
              <RequireSuperAdmin>
                <SuperAdminScreen />
              </RequireSuperAdmin>
            }
          />
          <Route
            path="/factory-dashboard"
            element={
              <RequireFactoryAdmin>
                <FactoryDashboardScreen />
              </RequireFactoryAdmin>
            }
          />
        </Routes>
      </HashRouter>
      <Toaster position="top-center" />
    </SessionProvider>
  );
}

export default App;
