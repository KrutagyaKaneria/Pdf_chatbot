import React, { useCallback, useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { UploadCloud, FileType } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const UploadDropzone = () => {
  const { setActiveCollection, setActiveChatId, setMessages, setError } = useChatStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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

    const formData = new FormData();
    formData.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}/upload-pdf`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      setUploading(false);
      if (request.status < 200 || request.status >= 300) {
        try {
            const parsed = JSON.parse(request.responseText);
            setError(parsed.detail || "Upload failed");
        } catch {
            setError("Upload failed");
        }
        return;
      }

      const data = JSON.parse(request.responseText);
      setActiveCollection({
        collectionName: data.collection_name,
        filename: data.filename || file.name,
        storedFilename: data.stored_filename || data.filename || file.name,
      });
      setActiveChatId(null);
      setMessages([]);
      setProgress(100);
      window.dispatchEvent(new CustomEvent('refresh-chats'));
    };

    request.onerror = () => {
      setUploading(false);
      setError("Upload failed. Confirm the backend is running and reachable.");
    };

    request.send(formData);
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
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl aspect-[16/10] relative"
      >
        <label 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
                w-full h-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-6 cursor-pointer overflow-hidden transition-all duration-300 relative group
                ${isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-white/10 hover:border-primary/50 bg-surface-container-high hover:bg-surface-bright"}
            `}
        >
            <input 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                onChange={onFileChange} 
                disabled={uploading} 
            />

            <AnimatePresence>
                {uploading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center"
                    >
                        <div className="w-64 h-2 bg-surface-container-highest rounded-full overflow-hidden mb-4 shadow-inner">
                            <motion.div 
                                className="h-full bg-primary"
                                initial={{ width: "0%" }}
                                animate={{ width: `${progress}%` }}
                                transition={{ ease: "easeOut" }}
                            />
                        </div>
                        <p className="text-on-surface font-headline italic tracking-wide">Analyzing Document... {progress}%</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 flex flex-col items-center pointer-events-none">
                <div className={`
                    w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500
                    ${isDragging ? "bg-primary text-on-primary scale-110 shadow-[0_0_30px_rgba(172,199,255,0.4)]" : "bg-white/5 text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110"}
                `}>
                    <UploadCloud size={36} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-headline text-on-surface mb-2 tracking-tight">Drop your PDF here</h3>
                <p className="text-on-surface-variant font-body text-sm text-center max-w-xs leading-relaxed">
                    Upload any document to begin an intelligent conversation with your data.
                </p>
            </div>

            {/* Cinematic background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-tertiary/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </label>
      </motion.div>
    </div>
  );
};

export default UploadDropzone;
