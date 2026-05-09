import React, { useEffect, useState } from "react";
import AppShell from "./components/layout/AppShell";
import MessageList from "./components/chat/MessageList";
import MessageInput from "./components/chat/MessageInput";
import PdfViewerPane from "./components/pdf/PdfViewerPane";
import { useChatStore } from "./store/useChatStore";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

function App() {
  const { setChats, activeCollection } = useChatStore();
  const [showPdf, setShowPdf] = useState(true);

  // Fetch initial chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/chats`);
        if (!res.ok) throw new Error("Unable to load chats");
        const data = await res.json();
        const chats = (data?.data?.chats ?? data?.chats) as unknown;
        setChats(Array.isArray(chats) ? chats : []);
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchChats();

    // Listen to refresh events
    const handleRefresh = () => fetchChats();
    window.addEventListener('refresh-chats', handleRefresh);
    return () => window.removeEventListener('refresh-chats', handleRefresh);
  }, [setChats]);

  return (
    <AppShell>
        <div className="flex w-full h-full">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col relative h-full min-w-0 transition-all duration-300">
            {/* Top Bar for Mobile/Toggle */}
            <div className="absolute top-4 right-4 z-50 md:block hidden">
                <button 
                    onClick={() => setShowPdf(!showPdf)}
                    className="p-2 bg-surface-container-highest border border-white/10 rounded-full text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all shadow-lg"
                    title={showPdf ? "Hide Document" : "Show Document"}
                >
                    {showPdf ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
            </div>

            <MessageList />
            <MessageInput />
          </div>

          {/* PDF Viewer Area */}
          <motion.div 
            initial={false}
            animate={{ 
                width: showPdf && activeCollection ? '50%' : '0%',
                opacity: showPdf && activeCollection ? 1 : 0
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full shrink-0 overflow-hidden hidden md:block"
          >
            {showPdf && activeCollection && <PdfViewerPane />}
          </motion.div>
        </div>
    </AppShell>
  );
}

export default App;
