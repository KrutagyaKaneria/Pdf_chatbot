import { create } from "zustand";
import { apiJson, getStoredAuth } from "../lib/api";

export interface Source {
  source: string;
  page: number | null;
}

export interface Message {
  message: string;
  isUser: boolean;
  sources?: Source[];
}

export interface ChatSummary {
  chat_id: string;
  title: string;
  collection_name: string;
  filename?: string | null;
  stored_filename?: string | null;
  created_at: string;
  last_updated?: string;
}

export interface StoredCollection {
  collectionName: string;
  filename: string;
  storedFilename?: string;
}

function chatTranscriptStorageKey(chatId: string): string {
  return `pdf_chatbot_chat_transcript:${chatId}`;
}

interface ChatState {
  messages: Message[];
  chats: ChatSummary[];
  activeChatId: string | null;
  activeCollection: StoredCollection | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setChats: (chats: ChatSummary[]) => void;
  setActiveChatId: (id: string | null) => void;
  setActiveCollection: (collection: StoredCollection | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  startNewChat: (clearDocument?: boolean) => void;
  typeMessage: (fullText: string, sources: Source[]) => void;
  openChat: (chatId: string) => Promise<void>;
  resetForAuthChange: () => void;
}

function collectionStorageKey(): string {
  const userId = getStoredAuth().user?.user_id || "anonymous";
  return `pdf_chatbot_collection:${userId}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  chats: [],
  activeChatId: null,
  activeCollection: (() => {
    const stored = window.localStorage.getItem(collectionStorageKey());
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      window.localStorage.removeItem(collectionStorageKey());
      return null;
    }
  })(),
  loading: false,
  error: null,

  setMessages: (messagesOrUpdater) => set((state) => ({
    messages: typeof messagesOrUpdater === 'function' ? messagesOrUpdater(state.messages) : messagesOrUpdater
  })),
  setChats: (chats) => set({ chats }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setActiveCollection: (collection) => {
    set({ activeCollection: collection });
    const storageKey = collectionStorageKey();
    if (collection) {
      window.localStorage.setItem(storageKey, JSON.stringify(collection));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  startNewChat: (clearDocument = false) => {
    set({ activeChatId: null, messages: [], error: null });
    if (clearDocument) {
      get().setActiveCollection(null);
    }
  },

  typeMessage: (fullText: string, sources: Source[]) => {
    const words = fullText.split(/\s+/).filter(Boolean);
    let index = 0;

    set((state) => ({
      messages: [...state.messages, { message: "", isUser: false, sources }]
    }));

    const interval = window.setInterval(() => {
      index += 1;
      set((state) => {
        const updated = [...state.messages];
        if (updated.length > 0) {
            updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            message: words.slice(0, index).join(" "),
            };
        }
        return { messages: updated };
      });

      if (index >= words.length) {
        window.clearInterval(interval);
        set({ loading: false });
      }
    }, 18);
  },

  openChat: async (chatId: string) => {
    set({ error: null });
    try {
      const data = await apiJson<{ data?: any; chat_id?: string; collection_name?: string; filename?: string; stored_filename?: string; messages?: Array<{ role: string; content: string }> }>(`/chats/${chatId}`);

      const payload = (data && typeof data === "object" && (data as any).data) ? (data as any).data : data;
      const collectionName = (payload as any)?.collection_name ?? (data as any)?.collection_name;
      const filename = (payload as any)?.filename ?? (data as any)?.filename;
      const storedFilename = (payload as any)?.stored_filename ?? (data as any)?.stored_filename;
      const openedChatId = (payload as any)?.chat_id ?? (data as any)?.chat_id;
      const payloadMessages = (payload as any)?.messages ?? (data as any)?.messages;
      const messages = Array.isArray(payloadMessages) ? payloadMessages : [];
      const cachedMessagesRaw = window.localStorage.getItem(chatTranscriptStorageKey(openedChatId));
      let cachedMessages: Message[] = [];
      if (cachedMessagesRaw) {
        try {
          cachedMessages = JSON.parse(cachedMessagesRaw) as Message[];
        } catch {
          window.localStorage.removeItem(chatTranscriptStorageKey(openedChatId));
        }
      }

      const openedCollection = {
        collectionName: collectionName,
        filename: filename || "Uploaded PDF",
        storedFilename: storedFilename || undefined,
      };

      const restoredMessages = messages.map((msg: { role: string; content: string }, index: number) => ({
        message: msg.content,
        isUser: msg.role === "user",
        sources: cachedMessages[index]?.sources,
      }));
      
      set({
        activeChatId: openedChatId,
        activeCollection: openedCollection,
        messages: restoredMessages,
      });
      window.localStorage.setItem(collectionStorageKey(), JSON.stringify(openedCollection));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Unable to open chat" });
    }
  },

  resetForAuthChange: () => {
    set({
      messages: [],
      chats: [],
      activeChatId: null,
      activeCollection: null,
      loading: false,
      error: null,
    });
  },
}));

export { chatTranscriptStorageKey };
