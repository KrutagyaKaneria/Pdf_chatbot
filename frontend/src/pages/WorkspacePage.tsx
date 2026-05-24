import React, { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import PdfViewerPane from "../components/pdf/PdfViewerPane";
import { useChatStore } from "../store/useChatStore";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { apiJson } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";

function WorkspacePage() {
  const { setChats, activeCollection } = useChatStore();
  const [showPdf, setShowPdf] = useState(true);
  const { ready, user } = useAuth();

  useEffect(() => {
    if (!ready || !user?.user_id) {
      setChats([]);
      return;
    }

    const fetchChats = async () => {
      try {
        const data = await apiJson<{ data?: { chats?: unknown }; chats?: unknown }>("/chats");
        const chats = (data?.data?.chats ?? data?.chats) as unknown;
        setChats(Array.isArray(chats) ? chats : []);
      } catch (err) {
        console.error(err);
      }
    };

    void fetchChats();

    const handleRefresh = () => void fetchChats();
    window.addEventListener("refresh-chats", handleRefresh);
    return () => window.removeEventListener("refresh-chats", handleRefresh);
  }, [ready, user?.user_id, setChats]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">Restoring session...</div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="flex w-full h-full">
        <div className="flex-1 flex flex-col relative h-full min-w-0 transition-all duration-300">
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

        <motion.div
          initial={false}
          animate={{
            width: showPdf && activeCollection ? "50%" : "0%",
            opacity: showPdf && activeCollection ? 1 : 0,
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

export default WorkspacePage;
