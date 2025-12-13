import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import MainLayout from "./components/layout/MainLayout";
import Intro from "./components/features/Intro";

import { LanguageProvider } from "./translations/LanguageContext";

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Routes>
          {/* Landing page - Intro shown to unlogged users */}
          <Route path="/" element={<Intro />} />
          
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Protected dashboard route */}
          <Route path="/dashboard" element={<MainLayout />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;