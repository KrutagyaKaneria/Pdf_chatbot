import React, { useEffect, useRef } from 'react';

const LivingPipeline = () => {
  const svgContainerRef = useRef<SVGSVGElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const svg = svgContainerRef.current;
    const workflowGrid = gridRef.current;
    if (!svg || !workflowGrid) return;
    
    let intervalId: NodeJS.Timeout;
    let timeoutIds: NodeJS.Timeout[] = [];

    const initPipeline = () => {
      const nodes = Array.from(workflowGrid.querySelectorAll('[data-step]')).sort(
        (a, b) => parseInt((a as HTMLElement).dataset.step || '0') - parseInt((b as HTMLElement).dataset.step || '0')
      );
      
      const svgRect = svg.getBoundingClientRect();
      svg.innerHTML = '';
      
      // Clear previous timeouts
      timeoutIds.forEach(clearTimeout);
      timeoutIds = [];
      clearInterval(intervalId);

      nodes.forEach((node, index) => {
        if (index === nodes.length - 1) return;
        
        const nextNode = nodes[index + 1];
        const r1 = node.querySelector('.node-card')!.getBoundingClientRect();
        const r2 = nextNode.querySelector('.node-card')!.getBoundingClientRect();
        
        const x1 = r1.left + r1.width / 2 - svgRect.left;
        const y1 = r1.top + r1.height / 2 - svgRect.top;
        const x2 = r2.left + r2.width / 2 - svgRect.left;
        const y2 = r2.top + r2.height / 2 - svgRect.top;
        
        const pathId = `path-new-step-${index + 1}`;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        
        let d;
        if (Math.abs(y1 - y2) < 20) {
          d = `M ${x1} ${y1} L ${x2} ${y2}`;
        } else {
          const midX = (x1 + x2) / 2;
          d = `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`;
        }
        
        path.setAttribute("d", d);
        path.setAttribute("class", "pipeline-line");
        path.setAttribute("id", pathId);
        svg.appendChild(path);
        
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("r", "3");
        dot.setAttribute("class", "packet-dot animate-packet");
        (dot as any).style.offsetPath = `path('${d}')`;
        dot.style.animationDelay = `${index * 0.6}s`;
        svg.appendChild(dot);
      });
      
      intervalId = setInterval(() => {
        nodes.forEach((node) => {
            const card = node.querySelector('.node-card');
            if (card) {
                card.classList.add('active-glow');
                timeoutIds.push(setTimeout(() => card.classList.remove('active-glow'), 800));
            }
        });
      }, 3000);
    };

    const handleResize = () => {
        timeoutIds.push(setTimeout(initPipeline, 200));
    };

    // Need to wait slightly for fonts/layout to settle before measuring
    timeoutIds.push(setTimeout(initPipeline, 500));
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(intervalId);
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  return (
    <section className="relative pt-12 pb-24 px-12 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-display text-5xl text-on-surface">The Living <br/><span className="italic text-primary">Pipeline.</span></h2>
            <p className="font-body text-on-surface-variant max-w-md leading-relaxed">
              Witness the transformation of static documents into dynamic neural assets. Our proprietary RAG pipeline orchestrates multi-modal ingestion with sub-millisecond retrieval latency.
            </p>
          </div>
          <div className="lg:col-span-7 flex justify-end">
            <div className="flex items-center gap-3 bg-surface-container-high/40 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-label uppercase tracking-widest text-on-surface">End-to-End RAG Pipeline Status: Nominal</span>
            </div>
          </div>
        </div>
        
        <div className="relative glass-panel rounded-[3rem] p-12 lg:p-20 overflow-hidden min-h-[600px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
          
          <svg 
            ref={svgContainerRef} 
            className="pipeline-svg" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} 
            viewBox="0 0 1000 500"
          ></svg>
          
          <div ref={gridRef} className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-y-16 gap-x-8 w-full max-w-5xl mx-auto">
            <div className="flex flex-col items-center gap-4 group" data-step="1">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative overflow-hidden">
                <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">1. Upload</span>
            </div>
            <div className="flex flex-col items-center gap-4 group" data-step="2">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">description</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">2. Parsing</span>
            </div>
            <div className="flex flex-col items-center gap-4 group" data-step="3">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">view_agenda</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">3. Chunking</span>
            </div>
            <div className="flex flex-col items-center gap-4 group" data-step="4">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">auto_fix_high</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">4. Embeddings</span>
            </div>
            <div className="flex flex-col items-center gap-4 group" data-step="5">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">database</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">5. PGVector</span>
            </div>
            
            <div className="flex flex-col items-center gap-4 group md:order-last" data-step="10">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">chat</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">10. Streaming</span>
            </div>
            <div className="flex flex-col items-center gap-4 group" data-step="9">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">memory</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">9. LLM Gen</span>
            </div>
            <div className="flex flex-col items-center gap-4 group" data-step="8">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">history</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">8. Memory</span>
            </div>
            <div className="flex flex-col items-center gap-4 group" data-step="7">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">sort</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">7. Reranking</span>
            </div>
            <div className="flex flex-col items-center gap-4 group" data-step="6">
              <div className="node-card w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary text-3xl">search</span>
              </div>
              <span className="text-[9px] font-label tracking-widest text-on-surface-variant uppercase text-center">6. Hybrid Retrieval</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LivingPipeline;
