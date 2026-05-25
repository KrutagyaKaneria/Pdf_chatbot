import React, { useEffect } from 'react';

const InfrastructureLattice = () => {
  useEffect(() => {
    const cards = document.querySelectorAll('.tilt-card');
    
    cards.forEach(card => {
      const handleMouseMove = (e: Event) => {
        const mouseEvent = e as MouseEvent;
        const target = card as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = mouseEvent.clientX - rect.left;
        const y = mouseEvent.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        target.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      };

      const handleMouseLeave = () => {
        const target = card as HTMLElement;
        target.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      };

      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      };
    });
  }, []);

  return (
    <section className="py-24 px-12 bg-surface-container-lowest/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div>
            <span className="font-label text-xs text-primary uppercase tracking-[0.3em] mb-4 block">Engineered for Scale</span>
            <h2 className="font-display text-5xl text-on-surface">The Infrastructure Lattice</h2>
          </div>
          <p className="font-body text-on-surface-variant max-w-sm text-right">
            Our tech stack is a synchronized ensemble of world-class infrastructure, purpose-built for high-frequency editorial intelligence.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 tilt-container">
          {/* Stack Card 1 */}
          <div className="glass-panel p-10 rounded-3xl relative overflow-hidden group tilt-card animate-float" style={{ animationDelay: '0s' }}>
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity">
              <span className="material-symbols-outlined text-8xl">storage</span>
            </div>
            <h3 className="font-display text-3xl mb-4">PostgreSQL + PGVector</h3>
            <p className="font-body text-on-surface-variant leading-relaxed mb-8">
              The bedrock of our long-term memory. We leverage HNSW indexing for approximate nearest neighbor search with 99% recall.
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-label text-primary">RDBMS</span>
              <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-label text-primary">VECTOR</span>
            </div>
          </div>
          
          {/* Stack Card 2 */}
          <div className="glass-panel p-10 rounded-3xl relative overflow-hidden group tilt-card border-primary/20 bg-primary/[0.02] animate-float" style={{ animationDelay: '1s' }}>
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity">
              <span className="material-symbols-outlined text-8xl">bolt</span>
            </div>
            <h3 className="font-display text-3xl mb-4">Groq Inference</h3>
            <p className="font-body text-on-surface-variant leading-relaxed mb-8">
              Real-time intelligence powered by LPU™ technology. Experience token generation speeds that match human thought patterns.
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-primary/20 rounded-full text-[10px] font-label text-primary">LPU™</span>
              <span className="px-3 py-1 bg-primary/20 rounded-full text-[10px] font-label text-primary">500 T/S</span>
            </div>
          </div>
          
          {/* Stack Card 3 */}
          <div className="glass-panel p-10 rounded-3xl relative overflow-hidden group tilt-card animate-float" style={{ animationDelay: '2s' }}>
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity">
              <span className="material-symbols-outlined text-8xl">link</span>
            </div>
            <h3 className="font-display text-3xl mb-4">LangChain / Redis</h3>
            <p className="font-body text-on-surface-variant leading-relaxed mb-8">
              State management and orchestration. Redis handles our conversational memory while LangChain directs the agentic flow.
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-label text-primary">CACHE</span>
              <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-label text-primary">AGENTS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfrastructureLattice;
