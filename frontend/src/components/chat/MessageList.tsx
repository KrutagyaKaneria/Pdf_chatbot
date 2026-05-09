import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../../store/useChatStore";
import { useUiStore } from "../../store/useUiStore";
import AnimatedMarkdown from "./AnimatedMarkdown";
import { Bot, User } from "lucide-react";
import { formatSource } from "../../lib/utils";

const MessageList = () => {
    const { messages, loading, activeCollection } = useChatStore();
  const { setPdfPage } = useUiStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 my-auto h-full">
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-surface-container-low rounded-3xl mb-8 flex items-center justify-center border border-white/5 relative"
        >
          <Bot size={40} className="text-primary" />
          <div className="absolute -right-1 -bottom-1 intelligence-pulse"></div>
        </motion.div>
        <h3 className="font-headline text-4xl text-on-surface mb-4 tracking-tight">Ask anything about your PDF</h3>
        <p className="text-on-surface-variant font-body max-w-sm mb-10 leading-relaxed">
          {activeCollection ? `I've analyzed ${activeCollection.filename}. Try asking me one of these:` : "Upload a PDF, then ask me anything about it."}
        </p>
        
        {activeCollection && (
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap justify-center gap-3 max-w-2xl"
            >
                {["Summarize this document", "What are the key points?", "List all headings"].map((question, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => {
                            // trigger message from App.tsx handler, or via store action
                            // we'll pass handleSendMessage as a prop if needed, or use a window event
                            window.dispatchEvent(new CustomEvent('send-message', { detail: question }));
                        }} 
                        className="px-5 py-2.5 rounded-full bg-surface-container-high border border-white/5 text-sm font-medium hover:bg-surface-bright hover:-translate-y-0.5 transition-all duration-300 text-on-surface shadow-lg"
                    >
                        {question}
                    </button>
                ))}
            </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto px-4 md:px-8 py-12 flex flex-col gap-12 max-w-4xl mx-auto w-full relative z-10 scroll-smooth custom-scrollbar pb-32">
      <AnimatePresence initial={false}>
        {messages.map((msg, index) => {
            const isLastAi = !msg.isUser && index === messages.length - 1;
            return (
            <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                className={`flex ${msg.isUser ? "justify-end" : "justify-start"} gap-4 items-start w-full`}
            >
                {!msg.isUser && (
                    <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 border border-white/10 mt-1 shadow-lg">
                        <Bot size={20} className="text-primary" />
                    </div>
                )}
                
                <div className={`max-w-[85%] md:max-w-2xl ${msg.isUser ? 'order-1' : 'order-2'}`}>
                    <div className={`
                        p-5 rounded-2xl shadow-xl border
                        ${msg.isUser 
                            ? "bg-primary-container text-on-primary-container rounded-tr-none border-primary/20" 
                            : "bg-surface-container-highest rounded-tl-none border-white/5 text-on-surface"
                        }
                    `}>
                        <AnimatedMarkdown content={msg.message} isStreaming={isLastAi && loading} />
                        
                        {!msg.isUser && msg.sources && msg.sources.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-2">
                                {msg.sources.map((source, idx) => (
                                    <button
                                        key={`${source.source}-${source.page}-${idx}`}
                                        onClick={() => source.page && setPdfPage(source.page)}
                                        className="text-xs font-medium text-primary hover:text-primary-container transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/20 flex items-center gap-1.5"
                                    >
                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                        Pg {source.page ?? "N/A"} - {formatSource(source.source)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {msg.isUser && (
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 border border-white/10 mt-1 order-2 shadow-lg">
                        <User size={20} className="text-on-surface-variant" />
                    </div>
                )}
            </motion.div>
        )})}
      </AnimatePresence>

      {loading && messages.length > 0 && messages[messages.length - 1].isUser && (
         <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 items-start w-full"
        >
           <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 border border-white/10 mt-1 shadow-lg">
             <Bot size={20} className="text-primary" />
           </div>
           <div className="bg-surface-container-highest rounded-2xl rounded-tl-none p-5 border border-white/5 shadow-xl flex items-center gap-2 h-[58px]">
              <div className="intelligence-pulse animate-pulse"></div>
              <div className="intelligence-pulse animate-pulse delay-75"></div>
              <div className="intelligence-pulse animate-pulse delay-150"></div>
           </div>
         </motion.div>
      )}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};

export default MessageList;
