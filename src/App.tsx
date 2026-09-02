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
import TeamDashboardScreen from "./screens/TeamDashboardScreen";
import AccidentManagementScreen from "./screens/AccidentManagementScreen";

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
  const { homeFactory, isLoading } = useSession();
  if (isLoading) return null;
  if (!homeFactory) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireTeamAdmin({ children }: { children: React.ReactNode }) {
  const { userName, teamName, isAdmin, isLoading } = useSession();
  if (isLoading) return null;
  if (!userName || !teamName || !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { userName, teamName, isSuperAdmin, isLoading } = useSession();
  if (isLoading) return null;
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
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
          <Route
            path="/team-dashboard"
            element={
              <RequireTeamAdmin>
                <TeamDashboardScreen />
              </RequireTeamAdmin>
            }
          />
          <Route
            path="/accident-management"
            element={
              <RequireTeamAdmin>
                <AccidentManagementScreen />
              </RequireTeamAdmin>
            }
          />
        </Routes>
      </HashRouter>
      <Toaster position="top-center" />
    </SessionProvider>
  );
}

export default App;
