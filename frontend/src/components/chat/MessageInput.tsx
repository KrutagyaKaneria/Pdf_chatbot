import React, { useState, useEffect } from "react";
import { useChatStore } from "../../store/useChatStore";
import { Paperclip, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const MessageInput = () => {
  const [inputValue, setInputValue] = useState("");
  const { activeCollection, loading, setMessages, setLoading, setError, activeChatId, setActiveChatId, typeMessage } = useChatStore();
  const [isUploading, setIsUploading] = useState(false);

  const canSend = Boolean(inputValue.trim() && activeCollection && !loading && !isUploading);

  useEffect(() => {
    const handleSendEvent = (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        handleSendMessage(customEvent.detail);
    };
    window.addEventListener('send-message', handleSendEvent);
    return () => window.removeEventListener('send-message', handleSendEvent);
  }, [activeCollection, activeChatId, loading]);

  const handleSendMessage = async (message: string) => {
    if (!message || !activeCollection || loading) return;

    setInputValue("");
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { message, isUser: true }]);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: message,
          collection_name: activeCollection.collectionName,
          chat_id: activeChatId,
          filename: activeCollection.filename,
          stored_filename: activeCollection.storedFilename,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Chat request failed");

      setActiveChatId(data.chat_id);
      typeMessage(data.answer, data.docs?.slice(0, 4) || []);
      // trigger refresh of chats in sidebar via an event or store method
      window.dispatchEvent(new CustomEvent('refresh-chats'));
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Chat request failed";
      setError(messageText);
      setMessages((prev) => prev.slice(0, -1));
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage(inputValue.trim());
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 pt-16 bg-gradient-to-t from-background via-background to-transparent z-20 pointer-events-none">
      <div className="max-w-4xl mx-auto w-full pointer-events-auto">
        <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative group"
        >
          <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 rounded-full pointer-events-none"></div>
          
          <div className="relative flex items-center bg-surface-container-highest rounded-full px-6 py-3 border border-white/5 focus-within:border-primary/50 focus-within:bg-surface-bright transition-all duration-300 shadow-2xl">
            <input 
              className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder-on-surface-variant font-body py-2 pr-4 outline-none" 
              placeholder={activeCollection ? "Ask a question about your PDF..." : "Upload a PDF first..."} 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={!activeCollection || isUploading}
            />
            
            <div className="flex items-center gap-2 shrink-0">
              <button 
                className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                disabled={isUploading}
              >
                <Paperclip size={20} />
              </button>
              
              <button 
                  className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                      canSend 
                        ? "bg-primary text-on-primary hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(172,199,255,0.4)]" 
                        : "bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50"
                  )}
                  onClick={() => handleSendMessage(inputValue.trim())}
                  disabled={!canSend}
              >
                <ArrowUp size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MessageInput;
