import React, { useCallback, useRef, useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { FileUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useUiStore } from "../../store/useUiStore";
import { uploadPdf } from "../../lib/api";

const SidebarUploadZone = () => {
  const { setActiveCollection, setActiveChatId, setMessages, setError } = useChatStore();
  const { isSidebarOpen } = useUiStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    uploadPdf(file, (nextProgress) => setProgress(nextProgress))
      .then(async (request) => {
        setUploading(false);
        const responseText = await request.text();
        if (request.status < 200 || request.status >= 300) {
          try {
            const parsed = JSON.parse(responseText);
            setError(parsed.detail || "Upload failed");
          } catch {
            setError("Upload failed");
          }
          return;
        }

        const data = JSON.parse(responseText);
        setActiveCollection({
          collectionName: data.collection_name,
          filename: data.filename || file.name,
          storedFilename: data.stored_filename || data.filename || file.name,
        });
        setActiveChatId(null);
        setMessages([]);
        setProgress(100);
        window.dispatchEvent(new CustomEvent('refresh-chats'));
      })
      .catch(() => {
        setUploading(false);
        setError("Upload failed. Confirm the backend is running and reachable.");
      });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
    e.target.value = "";
  };

    return (
    <div className={cn("px-4 mb-6 transition-all duration-300", !isSidebarOpen && "px-2")}>
      <label 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
                "w-full rounded-xl border border-white/10 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 relative group bg-surface-container-high hover:bg-surface-bright",
                isDragging && "border-primary bg-primary/10",
                isSidebarOpen ? "py-6 gap-3" : "py-4 gap-2"
            )}
        >
            <input 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                onChange={onFileChange} 
                disabled={uploading} 
          ref={fileInputRef}
            />

            <AnimatePresence>
                {uploading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-background/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4"
                    >
                        <Loader2 size={24} className="text-primary animate-spin mb-2" />
                        {isSidebarOpen && (
                            <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-primary"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{}}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 flex flex-col items-center pointer-events-none text-on-surface-variant group-hover:text-primary transition-colors">
                <FileUp size={24} strokeWidth={1.5} className="mb-1" />
                {isSidebarOpen && (
                    <span className="text-xs font-medium">Drop your PDF here</span>
                )}
            </div>
        </label>

          {isSidebarOpen && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all border",
                uploading
                  ? "bg-surface-container-highest text-on-surface-variant border-white/10 opacity-60 cursor-not-allowed"
                  : "bg-primary text-on-primary border-primary/20 hover:bg-primary/90"
              )}
            >
              New Chat
            </button>
          )}
    </div>
  );
};

export default SidebarUploadZone;
