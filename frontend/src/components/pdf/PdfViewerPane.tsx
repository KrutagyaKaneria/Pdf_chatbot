import React from "react";
import { useChatStore } from "../../store/useChatStore";
import { useUiStore } from "../../store/useUiStore";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const PdfViewerPane = () => {
  const { activeCollection } = useChatStore();
  const { pdfPage } = useUiStore();

  if (!activeCollection) {
    return null;
  }

  const encodedFilename = encodeURIComponent(activeCollection.storedFilename || activeCollection.filename);
  const pdfUrl = `${API_BASE_URL}/pdfs/${encodedFilename}#page=${pdfPage}&toolbar=0&navpanes=0`;

  return (
    <div className="w-full h-full bg-surface-container-highest border-l border-white/5 relative flex flex-col">
      <div className="h-12 bg-surface border-b border-white/5 flex items-center px-4 shrink-0 shadow-sm z-10">
        <span className="font-headline text-sm text-on-surface truncate">{activeCollection.filename}</span>
        <span className="ml-auto text-xs text-on-surface-variant font-label uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">Page {pdfPage}</span>
      </div>
      <div className="flex-grow w-full relative bg-surface-container-low">
        <iframe
          key={`${pdfUrl}-${pdfPage}`}
          title="PDF Viewer"
          src={pdfUrl}
          className="w-full h-full border-none absolute inset-0"
        />
        {/* Subtle inner shadow overlay to integrate the iframe into the dark theme */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-10"></div>
      </div>
    </div>
  );
};

export default PdfViewerPane;
