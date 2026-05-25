import React, { useEffect } from 'react';

const ArchHeroSection = () => {
  useEffect(() => {
    const nodes = document.querySelectorAll('.group\\/node');
    const paths = document.querySelectorAll('.pipeline-path');
    
    nodes.forEach(node => {
      node.addEventListener('mouseenter', () => {
        const id = node.id;
        paths.forEach(p => {
          if (p.id.includes(id.replace('node-', ''))) {
            (p as HTMLElement).style.stroke = '#acc7ff';
            (p as HTMLElement).style.strokeWidth = '3';
            (p as HTMLElement).style.strokeDasharray = '0';
          } else {
            (p as HTMLElement).style.opacity = '0.2';
          }
        });
      });
      
      node.addEventListener('mouseleave', () => {
        paths.forEach(p => {
          (p as HTMLElement).style.stroke = '';
          (p as HTMLElement).style.strokeWidth = '';
          (p as HTMLElement).style.strokeDasharray = '';
          (p as HTMLElement).style.opacity = '1';
        });
      });
    });
  }, []);

  return (
    <section className="relative pt-40 pb-20 px-12 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <h1 className="font-display text-7xl md:text-8xl leading-none text-on-surface">The Pulse of <br/><span className="italic text-primary">Intelligence.</span></h1>
          <p className="font-body text-lg text-on-surface-variant max-w-lg leading-relaxed">
            Witness the transformation of static documents into dynamic neural assets. Our proprietary RAG pipeline orchestrates multi-modal ingestion with sub-millisecond retrieval latency.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container" title="System Health: Optimal">
                <span className="material-symbols-outlined text-primary text-sm flex items-center justify-center h-full">check_circle</span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">99.9%</span>
              </div>
            </div>
            <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Uptime SLA & Processing Efficiency</span>
          </div>
        </div>

        {/* RAG Pipeline Interactive Visualization */}
        <div className="relative h-[550px] glass-panel rounded-[2.5rem] p-8 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none"></div>
          
          {/* Animated SVG Pipeline Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 500">
            {/* Paths definitions */}
            <path className="pipeline-path" d="M 100,80 C 150,80 150,250 300,250" fill="none" id="path-upload-embed" strokeWidth="2"></path>
            <path className="pipeline-path" d="M 500,80 C 450,80 450,250 300,250" fill="none" id="path-chunk-embed" strokeWidth="2"></path>
            <path className="pipeline-path" d="M 300,250 C 300,350 150,420 100,420" fill="none" id="path-embed-vector" strokeWidth="2"></path>
            <path className="pipeline-path" d="M 300,250 C 300,350 450,420 500,420" fill="none" id="path-embed-llm" strokeWidth="2"></path>
            
            {/* Animated Data Packets */}
            <circle className="data-packet packet-animate" r="4" style={{ offsetPath: "path('M 100,80 C 150,80 150,250 300,250')", animationDelay: '0s' }}></circle>
            <circle className="data-packet packet-animate" r="4" style={{ offsetPath: "path('M 500,80 C 450,80 450,250 300,250')", animationDelay: '1.5s' }}></circle>
            <circle className="data-packet packet-animate" r="4" style={{ offsetPath: "path('M 300,250 C 300,350 150,420 100,420')", animationDelay: '0.8s' }}></circle>
            <circle className="data-packet packet-animate" r="4" style={{ offsetPath: "path('M 300,250 C 300,350 450,420 500,420')", animationDelay: '2.2s' }}></circle>
          </svg>
          
          <div className="relative h-full flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <div className="p-4 bg-surface-container-highest rounded-xl border border-white/10 w-32 text-center hover:scale-110 transition-transform cursor-pointer group/node" id="node-upload">
                <span className="material-symbols-outlined text-primary mb-2 group-hover/node:animate-bounce">upload_file</span>
                <p className="text-[10px] font-label uppercase tracking-tighter">User Upload</p>
              </div>
              <div className="p-4 bg-surface-container-highest rounded-xl border border-white/10 w-32 text-center hover:scale-110 transition-transform cursor-pointer group/node" id="node-chunk">
                <span className="material-symbols-outlined text-primary mb-2 group-hover/node:animate-pulse">schema</span>
                <p className="text-[10px] font-label uppercase tracking-tighter">Chunking</p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <div className="relative group/node cursor-pointer" id="node-embed">
                <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full animate-pulse opacity-50 group-hover/node:opacity-100"></div>
                <div className="p-10 bg-primary/10 rounded-full border border-primary/40 backdrop-blur-xl relative z-10 hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                </div>
                <p className="absolute top-full left-1/2 -translate-x-1/2 mt-6 text-[10px] font-label uppercase text-primary whitespace-nowrap tracking-widest font-bold">Embedding Engine</p>
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div className="p-4 bg-surface-container-highest rounded-xl border border-white/10 w-32 text-center hover:scale-110 transition-transform cursor-pointer group/node" id="node-vector">
                <span className="material-symbols-outlined text-primary mb-2">database</span>
                <p className="text-[10px] font-label uppercase tracking-tighter">PGVector</p>
              </div>
              <div className="p-4 bg-surface-container-highest rounded-xl border border-white/10 w-32 text-center hover:scale-110 transition-transform cursor-pointer group/node" id="node-llm">
                <span className="material-symbols-outlined text-primary mb-2">memory</span>
                <p className="text-[10px] font-label uppercase tracking-tighter">LLM Synthesis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArchHeroSection;
