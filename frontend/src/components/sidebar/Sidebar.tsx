import React from "react";
import { motion } from "framer-motion";
import { useChatStore } from "../../store/useChatStore";
import { useUiStore } from "../../store/useUiStore";
import { FileText, MessageSquare, Settings, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";
import SidebarUploadZone from "./SidebarUploadZone";
import { useAuth } from "../../auth/AuthProvider";

const Sidebar = () => {
  const { chats, activeChatId, activeCollection } = useChatStore();
  const { isSidebarOpen, toggleSidebar, isMobileLayout } = useUiStore();
  const { user, logout } = useAuth();

  const mobileClass = isMobileLayout
    ? `fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} transition-transform duration-300 bg-background/90 glass-sidebar border-r border-white/5`
    : `h-screen glass-sidebar flex flex-col py-6 z-40 border-r border-white/5 shrink-0 relative transition-all duration-300`;

  return (
    <>
      {isMobileLayout && isSidebarOpen && (
        <div onClick={toggleSidebar} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      )}

      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen && !isMobileLayout ? 288 : isMobileLayout ? undefined : 80,
        }}
        className={mobileClass}
      >
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 w-6 h-6 bg-surface-container-high border border-white/10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-bright transition-colors z-50"
      >
        {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div className={cn("px-6 mb-8 flex items-center", isSidebarOpen ? "justify-start" : "justify-center px-0")}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="font-headline italic text-primary font-bold text-lg leading-none">A</span>
        </div>
        {isSidebarOpen && (
          <h1 className="font-headline text-2xl italic text-slate-100 tracking-tight ml-3">DocChat</h1>
        )}
      </div>

      <SidebarUploadZone />

      <div className="flex flex-col gap-2 overflow-y-auto flex-grow px-3 custom-scrollbar">
        {isSidebarOpen && (
            <div className="px-3 py-2 mt-2">
                <span className="font-label text-[0.65rem] uppercase tracking-widest text-outline">Active Document</span>
            </div>
        )}
        
        {activeCollection ? (
          <div className={cn("bg-primary/10 text-primary border-l-2 border-primary rounded-r-xl flex items-center gap-3 cursor-pointer transition-all", isSidebarOpen ? "px-4 py-3" : "p-3 justify-center mx-1 rounded-xl border-l-0 border border-primary/30")}>
            <FileText size={18} className="shrink-0" />
            {isSidebarOpen && (
                <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold truncate">{activeCollection.filename}</span>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-[0.65rem] opacity-80 uppercase tracking-wide">Ready</span>
                </div>
                </div>
            )}
          </div>
        ) : (
            isSidebarOpen && (
                <div className="px-4 py-3 text-sm text-on-surface-variant italic">
                    No document active
                </div>
            )
        )}

        {chats.length > 0 && (
            <>
                {isSidebarOpen && (
                    <div className="px-3 py-2 mt-4 mb-1">
                        <span className="font-label text-xs uppercase tracking-widest text-outline font-semibold">Library</span>
                    </div>
                )}
                {chats.map(chat => (
                <div 
                    key={chat.chat_id} 
                    onClick={() => useChatStore.getState().openChat(chat.chat_id)}
                    className={cn(
                        "rounded-xl flex items-center gap-3 cursor-pointer transition-all group", 
                        chat.chat_id === activeChatId 
                            ? "bg-white/10 text-white" 
                            : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
                        isSidebarOpen ? "px-4 py-3" : "p-3 justify-center mx-1"
                    )}
                >
                    <MessageSquare size={16} className={cn("shrink-0", chat.chat_id === activeChatId ? "text-primary" : "")} />
                    {isSidebarOpen && (
                        <div className="flex flex-col overflow-hidden w-full">
                        <span className="text-sm font-medium truncate group-hover:text-white transition-colors">{chat.title}</span>
                        </div>
                    )}
                </div>
                ))}
            </>
        )}
      </div>

      <div className={cn("pt-4 border-t border-white/5 flex flex-col gap-3 mt-auto", isSidebarOpen ? "px-6" : "px-3 items-center")}>
        {isSidebarOpen && user && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-widest text-outline mb-1">Account</div>
            <div className="text-sm font-semibold text-white truncate">{user.name || user.email || user.user_id}</div>
            <div className="text-xs text-on-surface-variant truncate">{user.email || user.user_id}</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => void logout()}
          className={cn("flex items-center text-slate-500 hover:text-slate-300 cursor-pointer transition-colors group w-full", isSidebarOpen ? "gap-3 px-4 py-2" : "p-2 justify-center")}
        >
          <LogOut size={18} />
          {isSidebarOpen && <span className="text-sm font-medium font-body">Logout</span>}
        </button>
        <div className={cn("flex items-center text-slate-500 hover:text-slate-300 cursor-pointer transition-colors group", isSidebarOpen ? "gap-3 px-4 py-2" : "p-2")}>
          <Settings size={18} className="group-hover:rotate-45 transition-transform duration-300" />
          {isSidebarOpen && <span className="text-sm font-medium font-body">Settings</span>}
        </div>
      </div>
    </motion.aside>
    </>
  );
};

export default Sidebar;
