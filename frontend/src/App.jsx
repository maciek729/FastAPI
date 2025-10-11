import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import MainLayout from "./components/Layout/MainLayout";
import Intro from "./components/Intro";

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;