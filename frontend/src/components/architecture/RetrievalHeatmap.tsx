import React, { useEffect, useRef, useState } from 'react';

const RetrievalHeatmap = () => {
  const heatmapGridRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const streamContainerRef = useRef<HTMLSpanElement>(null);
  
  const [cells, setCells] = useState<number[]>(Array.from({ length: 100 }).map((_, i) => i));

  useEffect(() => {
    // 3. Interactive Retrieval Heatmap
    const grid = heatmapGridRef.current;
    if (!grid) return;
    
    let heatmapTimeout: NodeJS.Timeout;
    
    const pulseHeatmap = () => {
      const children = Array.from(grid.children);
      children.forEach(cell => {
        const el = cell as HTMLElement;
        if (Math.random() > 0.9) {
          const opacity = Math.random() * 0.8;
          el.style.backgroundColor = `rgba(172, 199, 255, ${opacity})`;
          if (opacity > 0.6) {
            el.style.boxShadow = `0 0 10px rgba(172, 199, 255, ${opacity * 0.5})`;
          } else {
            el.style.boxShadow = 'none';
          }
        } else if (Math.random() > 0.5) {
          el.style.backgroundColor = `rgba(172, 199, 255, 0.05)`;
          el.style.boxShadow = 'none';
        }
      });
      heatmapTimeout = setTimeout(pulseHeatmap, 800);
    };
    
    pulseHeatmap();

    // 4. Live Terminal Simulation with Typewriter
    const logs = [
      "> INITIALIZING GROQ_LPU_V3...",
      "> QUERY_EMBEDDING_GENERATED (DIM: 1536)",
      "> CALCULATING COSINE SIMILARITY...",
      "> RETRIEVING CONTEXT FROM PGVECTOR...",
      "> RERANKING CANDIDATES VIA CROSS-ENCODER...",
      "> CONTEXT WINDOW OPTIMIZED (2.4k TOKENS)",
      "> STARTING LLM SYNTHESIS..."
    ];
    
    const streamText = "Based on the internal documentation provided, the Master Architecture utilizes a hybrid retrieval approach. This ensures that while semantic similarity captures the intent, BM25 keyword matching preserves technical accuracy for specific terminology like 'LPU™' and 'HNSW'. The final response is synthesized in under 200ms using the Groq high-speed inference engine.";
    
    let logIndex = 0;
    let charIndex = 0;
    let logTimeout: NodeJS.Timeout;
    let streamTimeout: NodeJS.Timeout;
    let resetTimeout: NodeJS.Timeout;

    const addLog = () => {
      if (logIndex < logs.length && logContainerRef.current) {
        const logEntry = document.createElement('div');
        logEntry.className = 'text-primary mb-1 text-xs opacity-0 transition-opacity duration-300';
        logEntry.textContent = logs[logIndex];
        logContainerRef.current.appendChild(logEntry);
        setTimeout(() => logEntry.classList.remove('opacity-0'), 10);
        logIndex++;
        logTimeout = setTimeout(addLog, 1200);
      } else {
        startStreaming();
      }
    };

    const startStreaming = () => {
      if (charIndex < streamText.length && streamContainerRef.current) {
        streamContainerRef.current.textContent += streamText.charAt(charIndex);
        charIndex++;
        streamTimeout = setTimeout(startStreaming, Math.random() * 30 + 10);
      } else {
        resetTimeout = setTimeout(resetTerminal, 5000);
      }
    };

    const resetTerminal = () => {
      if (logContainerRef.current) logContainerRef.current.innerHTML = "";
      if (streamContainerRef.current) streamContainerRef.current.textContent = "";
      logIndex = 0;
      charIndex = 0;
      addLog();
    };

    const initialTimeout = setTimeout(addLog, 1000);

    return () => {
      clearTimeout(heatmapTimeout);
      clearTimeout(logTimeout);
      clearTimeout(streamTimeout);
      clearTimeout(resetTimeout);
      clearTimeout(initialTimeout);
    };
  }, []);

  return (
    <section className="py-24 px-12 relative">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
        
        {/* Heatmap Visualization */}
        <div className="space-y-12">
          <div>
            <h2 className="font-display text-5xl mb-6">Retrieval Heatmap</h2>
            <p className="font-body text-on-surface-variant">Visualizing vector similarity during the retrieval phase. Each cell represents a semantic chunk, colored by its relevance score to the user query.</p>
          </div>
          
          <div ref={heatmapGridRef} className="grid grid-cols-10 gap-2 bg-surface-container/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm" id="heatmap-grid">
            {cells.map((i) => (
              <div key={i} className="heatmap-cell aspect-square rounded-sm bg-primary/5 border border-white/5"></div>
            ))}
          </div>
          
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-primary/20 rounded-full"></div>
                <div className="w-3 h-3 bg-primary/40 rounded-full"></div>
                <div className="w-3 h-3 bg-primary/70 rounded-full"></div>
                <div className="w-3 h-3 bg-primary rounded-full"></div>
              </div>
              <span className="text-[10px] font-label uppercase tracking-widest opacity-60 text-on-surface">Similarity Score</span>
            </div>
            <span className="text-xs font-mono text-primary animate-pulse">LATEST_QUERY: "hybrid architecture"</span>
          </div>
        </div>

        {/* Token Streaming Simulation */}
        <div className="glass-panel rounded-[2rem] border border-white/10 flex flex-col h-[500px]">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-surface-container/30">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/40"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/40"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/40"></div>
            </div>
            <span className="font-label text-xs uppercase tracking-tighter text-on-surface-variant">Live LLM Synthesis</span>
          </div>
          <div className="p-8 font-mono text-sm leading-relaxed text-on-surface-variant overflow-y-auto no-scrollbar flex-1" id="terminal-content">
            <div ref={logContainerRef} id="log-container">
              {/* Technical logs will appear here */}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <span ref={streamContainerRef} className="text-on-surface" id="streaming-text"></span>
              <span className="token-cursor"></span>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  );
};

export default RetrievalHeatmap;
