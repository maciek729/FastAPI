import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import MainLayout from "./components/layout/MainLayout";
import Intro from "./components/features/Intro";
import VerifyEmailPage from "./components/auth/VerifyEmailPage";

import { LanguageProvider } from "./translations/LanguageContext";

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--inner_section_bg)',
              color: 'var(--title)',
              border: '2px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Landing page - Intro shown to unlogged users */}
          <Route path="/" element={<Intro />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/auth/verify" element={<VerifyEmailPage />} />
          {/* Protected dashboard route */}
          <Route path="/dashboard" element={<MainLayout />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;