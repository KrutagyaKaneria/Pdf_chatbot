import React from "react";
import Sidebar from "../sidebar/Sidebar";
import { useUiStore } from "../../store/useUiStore";
import { cn } from "../../lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <>
      <div className="grain"></div>
      <div className="flex h-screen w-full relative overflow-hidden text-on-surface bg-background">
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
