// components/SidebarLayout.jsx
import Sidebar from "./Sidebar";

const SidebarLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-100 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default SidebarLayout;
