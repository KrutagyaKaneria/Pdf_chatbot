import React, {useCallback, useEffect, useRef, useState} from 'react'
import {ArrowUp, Loader2, Paperclip} from 'lucide-react'
import {motion} from 'framer-motion'
import {cn} from '../../lib/utils'
import {apiJson, uploadPdf} from '../../lib/api'
import {useChatStore} from '../../store/useChatStore'

const MessageInput = () => {
  const [inputValue, setInputValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {activeCollection, loading, setMessages, setLoading, setError, activeChatId, setActiveChatId, setActiveCollection, typeMessage} = useChatStore();

  const canSend = Boolean(inputValue.trim() && activeCollection && !loading);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message || !activeCollection || loading) return;

    setInputValue('');
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { message, isUser: true }]);

    try {
      const data = await apiJson<{ chat_id: string; answer: string; docs?: any[]; title: string }>(`/chat`, {
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
  }, [activeCollection, activeChatId, loading, setActiveChatId, setError, setLoading, setMessages, typeMessage]);

  const uploadFromComposer = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)

    uploadPdf(file, setProgress)
      .then(async (request) => {
        setUploading(false)
        const responseText = await request.text()
        if (request.status < 200 || request.status >= 300) {
          try {
            const parsed = JSON.parse(responseText)
            setError(parsed.detail || 'Upload failed')
          } catch {
            setError('Upload failed')
          }
          return
        }

        const data = JSON.parse(responseText)
        setActiveCollection({
          collectionName: data.collection_name,
          filename: data.filename || file.name,
          storedFilename: data.stored_filename || data.filename || file.name,
        })
        setMessages([])
        setActiveChatId(null)
        setError(null)
        window.dispatchEvent(new CustomEvent('refresh-chats'))
        setProgress(100)
      })
      .catch(() => {
        setUploading(false)
        setError('Upload failed. Confirm the backend is running and reachable.')
      })
  }, [setActiveChatId, setActiveCollection, setError, setMessages])

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      uploadFromComposer(event.target.files[0])
    }
    event.target.value = ''
  }

  useEffect(() => {
    const handleSendEvent = (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        handleSendMessage(customEvent.detail);
    };
    window.addEventListener('send-message', handleSendEvent);
    return () => window.removeEventListener('send-message', handleSendEvent);
  }, [handleSendMessage]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage(inputValue.trim())
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-8 md:px-8 md:pb-5">
      <div className="mx-auto w-full max-w-4xl pointer-events-auto">
        <motion.div
          initial={{y: 20, opacity: 0}}
          animate={{y: 0, opacity: 1}}
          className="relative group"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-primary/10 blur-xl opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 pointer-events-none" />

          <div className="relative rounded-[1.5rem] border border-white/10 bg-surface-container-highest/90 px-4 py-2.5 shadow-2xl backdrop-blur-xl focus-within:border-primary/40 focus-within:bg-surface-bright md:px-5 md:py-3">
            <div className="flex items-start gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onFileChange}
                disabled={uploading}
              />
              <textarea
                className="min-h-[40px] md:min-h-[48px] max-h-[120px] w-full resize-none border-none bg-transparent py-2 pr-4 text-sm leading-6 text-on-surface outline-none placeholder:text-on-surface-variant md:text-[0.95rem]"
                placeholder={activeCollection ? 'Ask a question about your PDF...' : 'Upload a PDF first...'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={!activeCollection || loading}
                rows={1}
              />

              <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Upload PDF"
                >
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                </button>

                <button
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300',
                    canSend
                      ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(172,199,255,0.4)] hover:scale-105 active:scale-95'
                      : 'cursor-not-allowed bg-surface-variant text-on-surface-variant opacity-50'
                  )}
                  onClick={() => void handleSendMessage(inputValue.trim())}
                  disabled={!canSend}
                >
                  <ArrowUp size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/5 pt-2 text-[11px] text-on-surface-variant">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Enter to send</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Shift + Enter for a new line</span>
              {uploading && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Uploading {progress}%</span>}
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Use citations in AI replies</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default MessageInput;
