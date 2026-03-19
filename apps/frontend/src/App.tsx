import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";

import { SignIn } from "./pages/auth/SignIn";
import { SignUp } from "./pages/auth/SignUp";
import { VerifyEmail } from "./pages/auth/VerifyEmail";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";
import { OAuthCallback } from "./pages/auth/OAuthCallback";

import { Dashboard } from "./pages/dashboard/Dashboard";
import { Projects } from "./pages/projects/Projects";
import { ApiKeys } from "./pages/api-keys/ApiKeys";
import { Team } from "./pages/team/Team";
import { Settings } from "./pages/settings/Settings";
import { NotFound } from "./pages/NotFound";
import { Landing } from "./pages/LandingPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Public-only */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          {/* OAuth callback — accessible without auth (handles the token itself) */}
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          {/* Verify email — accessible logged-in or out */}
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/api-keys" element={<ApiKeys />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
