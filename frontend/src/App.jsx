import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Dashboard from "./components/Dashboard"; 
import Chat from "./components/Chat";
import Intro from "./components/Intro";
import Sidebar from "./components/Sidebar";
import NotebookView from "./components/NotebookView";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sidebar" element={<Sidebar />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/intro" element={<Intro/>}/>    
        <Route path="/notebookView" element={<NotebookView/>}/>        
    
      </Routes>
    </BrowserRouter>
  );
}

export default App;