import React, {useEffect, useMemo, useState} from 'react'
import AppShell from "../components/layout/AppShell";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import PdfViewerPane from "../components/pdf/PdfViewerPane";
import { chatTranscriptStorageKey, useChatStore } from "../store/useChatStore";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { apiJson } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { WelcomeOnboarding } from '../components/onboarding/WelcomeOnboarding'

function WorkspacePage() {
  const { setChats, activeCollection, activeChatId, messages } = useChatStore();
  const [showPdf, setShowPdf] = useState(true);
  const { ready, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const onboardingKey = useMemo(() => (user?.user_id ? `docchat:onboarding_seen:${user.user_id}` : null), [user?.user_id])

  const tipOfTheDay = useMemo(() => {
    const tips = [
      'Start with a summary prompt, then drill into sections using follow-up questions.',
      'Use citation chips to move from the answer back into the exact page.',
      'Try asking for tables, action items, or key takeaways when the document is dense.',
    ]
    return tips[new Date().getDate() % tips.length]
  }, [])

  useEffect(() => {
    if (!ready || !user?.user_id) {
      setChats([]);
      setShowOnboarding(false);
      return;
    }

    const seenOnboarding = onboardingKey ? window.localStorage.getItem(onboardingKey) === '1' : true
    setShowOnboarding(!seenOnboarding)

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
  }, [ready, user?.user_id, onboardingKey, setChats]);

  const completeOnboarding = () => {
    if (onboardingKey) {
      window.localStorage.setItem(onboardingKey, '1')
    }
    setShowOnboarding(false)
  }

  useEffect(() => {
    if (!activeChatId) {
      return
    }

    window.localStorage.setItem(chatTranscriptStorageKey(activeChatId), JSON.stringify(messages))
  }, [activeChatId, messages])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">Restoring session...</div>
      </div>
    );
  }

  return (
    <>
      <AppShell>
        <div className="flex h-full w-full">
          <div className="relative flex min-w-0 flex-1 flex-col transition-all duration-300">
            <div className="absolute right-4 top-4 z-50 hidden md:block">
              <button
                onClick={() => setShowPdf(!showPdf)}
                className="rounded-full border border-white/10 bg-surface-container-highest p-2 text-on-surface-variant shadow-lg transition-all hover:bg-white/5 hover:text-primary"
                title={showPdf ? 'Hide Document' : 'Show Document'}
              >
                {showPdf ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <MessageList />
              <MessageInput />
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{
              width: showPdf && activeCollection ? '50%' : '0%',
              opacity: showPdf && activeCollection ? 1 : 0,
            }}
            transition={{type: 'spring', stiffness: 300, damping: 30}}
            className="hidden h-full shrink-0 overflow-hidden md:block"
          >
            {showPdf && activeCollection && <PdfViewerPane />}
          </motion.div>
        </div>
      </AppShell>

      {showOnboarding && ready && user && (
        <WelcomeOnboarding
          userName={user.name || user.email || user.user_id}
          tipOfTheDay={tipOfTheDay}
          onComplete={completeOnboarding}
        />
      )}
    </>
  );
}

export default WorkspacePage;
