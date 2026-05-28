import React, { useEffect } from "react";
import Sidebar from "../sidebar/Sidebar";
import { useUiStore } from "../../store/useUiStore";
import { Menu } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isMobileLayout, setMobileLayout, toggleSidebar } = useUiStore();

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setMobileLayout(isMobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setMobileLayout]);

  return (
    <>
      <div className="grain"></div>

      {/* Mobile top bar */}
      {isMobileLayout && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background/60 backdrop-blur-sm border-b border-white/5 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} aria-label="Open menu" className="p-2 rounded-md hover:bg-white/5">
              <Menu size={18} />
            </button>
            <div className="text-sm font-semibold">DocChat</div>
          </div>
        </div>
      )}

      <div className={`flex h-screen w-full relative overflow-hidden text-on-surface bg-background ${isMobileLayout ? 'pt-12' : ''}`}>
        <Sidebar />

        <main className="flex-grow flex flex-col relative overflow-hidden bg-background/50">
          {children}

          {/* Ambient Background Glows */}
          <div className="absolute top-1/4 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
          <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
        </main>
      </div>
    </>
  );
};

export default AppShell;
