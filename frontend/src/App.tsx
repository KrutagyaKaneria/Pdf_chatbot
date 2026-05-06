import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

interface Source {
  source: string;
  page: number | null;
}

interface Message {
  message: string;
  isUser: boolean;
  sources?: Source[];
}

interface ChatSummary {
  chat_id: string;
  title: string;
  collection_name: string;
  created_at: string;
  last_updated?: string;
}

interface StoredCollection {
  collectionName: string;
  filename: string;
}

function App() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<StoredCollection | null>(() => {
    const stored = window.localStorage.getItem("pdf_chatbot_collection");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      window.localStorage.removeItem("pdf_chatbot_collection");
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => Boolean(inputValue.trim() && activeCollection && !loading && !uploading),
    [activeCollection, inputValue, loading, uploading]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    refreshChats();
  }, []);

  const refreshChats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chats`);
      if (!res.ok) throw new Error("Unable to load chats");
      setChats(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const persistCollection = (collection: StoredCollection) => {
    setActiveCollection(collection);
    window.localStorage.setItem("pdf_chatbot_collection", JSON.stringify(collection));
  };

  const uploadPdf = (file: File) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}/upload-pdf`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      setUploading(false);
      if (request.status < 200 || request.status >= 300) {
        setError(readUploadError(request.responseText));
        return;
      }

      const data = JSON.parse(request.responseText);
      persistCollection({
        collectionName: data.collection_name,
        filename: data.filename || file.name,
      });
      setActiveChatId(null);
      setMessages([]);
      setUploadProgress(100);
    };

    request.onerror = () => {
      setUploading(false);
      setError("Upload failed. Confirm the backend is running and reachable.");
    };

    request.send(formData);
  };

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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Chat request failed");

      setActiveChatId(data.chat_id);
      typeMessage(data.answer, data.docs?.slice(0, 4) || []);
      await refreshChats();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Chat request failed";
      setError(messageText);
      setMessages((prev) => prev.slice(0, -1));
      setLoading(false);
    }
  };

  const openChat = async (chatId: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/chats/${chatId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unable to open chat");

      setActiveChatId(data.chat_id);
      const openedCollection = {
        collectionName: data.collection_name,
        filename: activeCollection?.filename || "Uploaded PDF",
      };
      setActiveCollection(openedCollection);
      window.localStorage.setItem("pdf_chatbot_collection", JSON.stringify(openedCollection));
      setMessages(
        data.messages.map((msg: { role: string; content: string }) => ({
          message: msg.content,
          isUser: msg.role === "user",
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open chat");
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setInputValue("");
    setError(null);
  };

  const typeMessage = (fullText: string, sources: Source[]) => {
    const words = fullText.split(/\s+/).filter(Boolean);
    let index = 0;

    setMessages((prev) => [...prev, { message: "", isUser: false, sources }]);

    const interval = window.setInterval(() => {
      index += 1;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          message: words.slice(0, index).join(" "),
        };
        return updated;
      });

      if (index >= words.length) {
        window.clearInterval(interval);
        setLoading(false);
      }
    }, 18);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage(inputValue.trim());
    }
  };

  function formatSource(source: string) {
    const file = source.split(/[/\\]/).pop() || "Uploaded PDF";
    return file.replace(".pdf", "").replace(/[-_]/g, " ").slice(0, 56);
  }

  function readUploadError(responseText: string) {
    try {
      const parsed = JSON.parse(responseText);
      return parsed.detail || "Upload failed";
    } catch {
      return "Upload failed";
    }
  }

  return (
    <>
      <div className="grain"></div>
      <div className="flex h-screen w-full relative overflow-hidden text-on-surface">
        <aside className="h-screen w-72 glass-sidebar flex flex-col py-8 gap-4 z-40 border-r border-white/5 shrink-0">
          <div className="px-8 mb-8">
            <h1 className="font-headline text-3xl italic text-slate-100 tracking-tight">DocChat</h1>
          </div>
          
          <div className="px-6 mb-6">
            <label className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 bg-white/5 group relative overflow-hidden">
              {uploading && (
                  <div className="absolute inset-0 bg-white/5 flex flex-col justify-end">
                      <div className="h-1 w-full bg-white/10">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                  </div>
              )}
              <input type="file" accept="application/pdf" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadPdf(file);
                  event.currentTarget.value = "";
              }} disabled={uploading} />
              
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform relative z-10">
                <span className="material-symbols-outlined text-3xl">upload_file</span>
              </div>
              <p className="font-body text-sm font-medium text-on-surface-variant relative z-10">Drop your PDF here</p>
            </label>
          </div>

          <div className="px-4 flex flex-col gap-2 overflow-y-auto flex-grow">
            <div className="px-4 py-2">
              <span className="font-label text-[0.6875rem] uppercase tracking-widest text-outline">Library</span>
            </div>
            
            {activeCollection && (
              <div className="bg-blue-500/10 text-blue-400 border-r-2 border-blue-500 px-4 py-3 rounded-l-xl flex items-center gap-3 group cursor-pointer transition-all">
                <span className="material-symbols-outlined text-blue-400">description</span>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold truncate">{activeCollection.filename}</span>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[0.7rem] text-blue-400/70">Active</span>
                  </div>
                </div>
              </div>
            )}

            {chats.map(chat => (
              <div key={chat.chat_id} onClick={() => openChat(chat.chat_id)} className={`px-4 py-3 rounded-xl flex items-center gap-3 group cursor-pointer transition-all ${chat.chat_id === activeChatId ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-base">chat_bubble</span>
                <div className="flex flex-col overflow-hidden w-full">
                  <span className="text-sm font-medium truncate">{chat.title}</span>
                  <span className="text-[0.7rem]">{new Date(chat.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pt-4 border-t border-white/5 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors group">
              <span className="material-symbols-outlined group-hover:translate-x-1 duration-200">settings</span>
              <span className="text-sm font-medium font-body">Settings</span>
            </div>
          </div>
        </aside>

        <main className="flex-grow flex flex-col relative overflow-hidden">
          <header className="bg-slate-950/70 backdrop-blur-xl border-b border-white/5 px-6 h-16 flex justify-between items-center z-50 shrink-0">
            <div className="flex items-center gap-4">
              {activeCollection && (
                  <>
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <h2 className="font-headline text-lg italic text-slate-100">{activeCollection.filename}</h2>
                  </>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                <div className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-full cursor-pointer transition-colors">
                  <span className="material-symbols-outlined">help_outline</span>
                </div>
                <div className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-full cursor-pointer transition-colors">
                  <span className="material-symbols-outlined">settings</span>
                </div>
              </div>
              <button onClick={startNewChat} disabled={!activeCollection} className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-4 py-2 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 hover:shadow-[0_0_15px_rgba(172,199,255,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-sm">add</span>
                New Chat
              </button>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 ring-2 ring-primary/20 bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-primary">person</span>
              </div>
            </div>
          </header>

          {error && (
            <div className="bg-error-container text-on-error-container px-6 py-2 text-sm z-40 relative">
              {error}
            </div>
          )}

          <div className="flex-grow overflow-y-auto px-8 py-12 flex flex-col gap-12 max-w-4xl mx-auto w-full relative z-10 scroll-smooth">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 my-auto">
                <div className="w-20 h-20 bg-surface-container-low rounded-3xl mb-8 flex items-center justify-center border border-white/5 relative">
                  <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <div className="absolute -right-1 -bottom-1 intelligence-pulse"></div>
                </div>
                <h3 className="font-headline text-4xl text-on-surface mb-4">Ask anything about your PDF</h3>
                <p className="text-on-surface-variant font-body max-w-sm mb-10 leading-relaxed">
                  {activeCollection ? `I've analyzed ${activeCollection.filename}. Try asking me one of these:` : "Upload a PDF, then ask me anything about it."}
                </p>
                {activeCollection && (
                  <div className="flex flex-wrap justify-center gap-3">
                      {["Summarize this document", "What are the key points?", "List all headings"].map((question, idx) => (
                          <button key={idx} onClick={() => handleSendMessage(question)} className="px-5 py-2.5 rounded-full bg-surface-container-high border border-white/5 text-sm font-medium hover:bg-surface-bright transition-all text-on-surface">
                              {question}
                          </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8 pb-10">
                {messages.map((msg, index) => (
                  msg.isUser ? (
                      <div key={index} className="flex justify-end gap-4 items-start">
                        <div className="bg-primary-container text-on-primary-container rounded-2xl rounded-tr-none px-6 py-4 max-w-xl shadow-lg font-medium">
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                  ) : (
                      <div key={index} className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 border border-white/10">
                          <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
                        </div>
                        <div className="bg-surface-container-highest rounded-2xl rounded-tl-none p-5 max-w-2xl border-t border-white/5 shadow-xl">
                          <p className="text-on-surface leading-relaxed text-[0.95rem] whitespace-pre-wrap">{msg.message}</p>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                              {msg.sources.map((source, idx) => (
                                <a
                                  key={`${source.source}-${source.page}-${idx}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  href={`${API_BASE_URL}/pdfs/${encodeURIComponent(source.source.split(/[/\\]/).pop() || "")}${source.page ? `#page=${source.page}` : ""}`}
                                  className="text-xs text-primary hover:text-primary-container transition-colors bg-primary/10 px-2 py-1 rounded"
                                >
                                  Page {source.page ?? "N/A"} - {formatSource(source.source)}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                  )
                ))}
                {loading && (
                   <div className="flex gap-4 items-start">
                     <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 border border-white/10">
                       <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
                     </div>
                     <div className="bg-surface-container-highest rounded-2xl rounded-tl-none p-5 border-t border-white/5 shadow-xl flex items-center gap-2 h-[58px]">
                        <div className="intelligence-pulse animate-pulse"></div>
                        <div className="intelligence-pulse animate-pulse delay-75"></div>
                        <div className="intelligence-pulse animate-pulse delay-150"></div>
                     </div>
                   </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <div className="p-8 pb-12 pt-0 max-w-4xl mx-auto w-full shrink-0 z-20">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full pointer-events-none"></div>
              <div className="relative flex items-center bg-surface-container-highest rounded-full px-6 py-4 border-b-2 border-transparent focus-within:border-primary transition-all shadow-2xl">
                <input 
                  className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder-on-surface-variant font-body py-1 pr-4 outline-none" 
                  placeholder={activeCollection ? "Ask a question about your PDF..." : "Upload a PDF first..."} 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={!activeCollection || uploading}
                />
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">attach_file</span>
                  <button 
                      className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-105 active:scale-90 transition-transform shadow-lg disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                      onClick={() => handleSendMessage(inputValue.trim())}
                      disabled={!canSend}
                  >
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute top-1/4 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
          <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
        </main>
      </div>
    </>
  );
}

export default App;
