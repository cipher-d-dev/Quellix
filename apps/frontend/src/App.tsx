import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute.tsx";
import { AppShell } from "./components/layout/AppShell.tsx";

import { SignIn }          from "./pages/auth/SignIn.tsx";
import { SignUp }          from "./pages/auth/SignUp.tsx";
import { VerifyEmail }     from "./pages/auth/VerifyEmail.tsx";
import { ForgotPassword }  from "./pages/auth/ForgotPassword.tsx";
import { ResetPassword }   from "./pages/auth/ResetPassword.tsx";

import { Dashboard }  from "./pages/dashboard/Dashboard.tsx";
import { Projects }   from "./pages/projects/Projects.tsx";
import { ApiKeys }    from "./pages/api-keys/ApiKeys.tsx";
import { Team }       from "./pages/team/Team.tsx";
import { Settings }   from "./pages/settings/Settings.tsx";
import { NotFound }   from "./pages/NotFound.tsx";
import { Landing } from "./pages/LandingPage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root → dashboard */}
          <Route path="/" element={<Landing />} />

          {/* Public-only (redirect to /dashboard if logged in) */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/signin"          element={<SignIn />} />
            <Route path="/signup"          element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
          </Route>

          {/* Accessible logged-in or out */}
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected — requires auth, rendered inside the app shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects"  element={<Projects />} />
              <Route path="/api-keys"  element={<ApiKeys />} />
              <Route path="/team"      element={<Team />} />
              <Route path="/settings"  element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
