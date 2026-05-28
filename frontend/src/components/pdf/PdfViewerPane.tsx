import React, { useEffect, useMemo, useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { useUiStore } from "../../store/useUiStore";
import { apiFetch } from "../../lib/api";

const PdfViewerPane = () => {
  const { activeCollection } = useChatStore();
  const { pdfPage, setPdfPage } = useUiStore();
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fileKey = activeCollection?.storedFilename || activeCollection?.filename || "";
  const encodedFilename = useMemo(() => encodeURIComponent(fileKey), [fileKey]);

  useEffect(() => {
    if (!fileKey) {
      setPdfBlobUrl(null);
      setPdfError(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const loadPdf = async () => {
      setPdfError(null);
      setPdfBlobUrl(null);
      const response = await apiFetch(`/pdfs/${encodedFilename}`);
      if (!response.ok) {
        throw new Error("Unable to load this PDF for your account");
      }
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) {
        setPdfBlobUrl(objectUrl);
      }
    };

    loadPdf().catch((err) => {
      if (!cancelled) {
        setPdfError(err instanceof Error ? err.message : "Unable to load PDF");
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [encodedFilename, fileKey]);

  useEffect(() => {
    if (!activeCollection) {
      return;
    }

    const storageKey = `pdf_chatbot_pdf_page:${activeCollection.storedFilename || activeCollection.collectionName}`;
    const storedValue = window.localStorage.getItem(storageKey);
    const storedPage = storedValue ? Number(storedValue) : NaN;

    if (Number.isFinite(storedPage) && storedPage > 0) {
      setPdfPage(storedPage);
      return;
    }

    setPdfPage(1);
  }, [activeCollection, setPdfPage]);

  useEffect(() => {
    if (!activeCollection) {
      return;
    }

    const storageKey = `pdf_chatbot_pdf_page:${activeCollection.storedFilename || activeCollection.collectionName}`;
    window.localStorage.setItem(storageKey, String(pdfPage));
  }, [activeCollection, pdfPage]);

  const pdfUrl = useMemo(() => {
    if (!pdfBlobUrl) return "";
    return `${pdfBlobUrl}#page=${pdfPage}&toolbar=0&navpanes=0`;
  }, [pdfBlobUrl, pdfPage]);

  if (!activeCollection) {
    return null;
  }

  return (
    <div className="w-full h-full bg-surface-container-highest border-l border-white/5 relative flex flex-col">
      <div className="h-12 bg-surface border-b border-white/5 flex items-center px-4 shrink-0 shadow-sm z-10">
        <span className="font-headline text-sm text-on-surface truncate">{activeCollection.filename}</span>
        <span className="ml-auto text-xs text-on-surface-variant font-label uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">Page {pdfPage}</span>
      </div>
      <div className="flex-grow w-full relative bg-surface-container-low">
        {pdfError ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-on-surface-variant px-6 text-center">
            {pdfError}
          </div>
        ) : !pdfUrl ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-on-surface-variant">
            Loading secure PDF...
          </div>
        ) : (
          <iframe
            key={`${pdfUrl}-${pdfPage}`}
            title="PDF Viewer"
            src={pdfUrl}
            className="w-full h-full border-none absolute inset-0"
          />
        )}
        {/* Subtle inner shadow overlay to integrate the iframe into the dark theme */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-10"></div>
      </div>
    </div>
  );
};

export default PdfViewerPane;
