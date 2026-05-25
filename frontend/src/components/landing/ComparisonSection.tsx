import React from 'react';

const ComparisonSection = () => {
  return (
    <section className="py-24 bg-surface-container-low px-6 reveal">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <h2 className="text-5xl font-headline text-on-surface">Beyond Naive Retrieval</h2>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Basic chatbots lose context in long documents. DocChat uses <span className="text-primary font-bold">Hybrid Reranking</span> and <span className="text-primary font-bold">Recursive Summarization</span> to ensure every answer is grounded in the ground truth.
          </p>
          <ul className="space-y-6">
            <li className="flex gap-4">
              <div className="flex-none w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Zero Hallucination Guarantee</h4>
                <p className="text-on-surface-variant text-sm">Every response is hard-linked to specific PDF coordinates and text chunks.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-none w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Sub-Second Latency</h4>
                <p className="text-on-surface-variant text-sm">Engineered for enterprise scale with distributed vector search and caching.</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="relative glass-panel rounded-3xl p-8 aspect-square flex items-center justify-center overflow-hidden">
          {/* Comparison Visualization */}
          <div className="absolute inset-0 bg-surface-container-highest/20"></div>
          <div className="z-10 grid grid-cols-2 gap-8 w-full">
            <div className="space-y-4 text-center">
              <div className="h-48 bg-surface-container rounded-xl flex items-end justify-center p-4 gap-2">
                <div className="w-4 bg-error/20 h-1/4 rounded-t"></div>
                <div className="w-4 bg-error/20 h-2/4 rounded-t"></div>
                <div className="w-4 bg-error/40 h-1/3 rounded-t"></div>
              </div>
              <p className="text-label-sm uppercase font-bold text-error">Naive RAG</p>
              <p className="text-xs text-on-surface-variant italic">High hallucination risk</p>
            </div>
            <div className="space-y-4 text-center">
              <div className="h-48 bg-surface-container-highest rounded-xl flex items-end justify-center p-4 gap-2 relative overflow-hidden">
                <div className="absolute inset-0 shimmer opacity-20 rounded-xl"></div>
                <div className="w-4 bg-primary/60 h-2/3 rounded-t relative z-10"></div>
                <div className="w-4 bg-primary/80 h-4/5 rounded-t relative z-10"></div>
                <div className="w-4 bg-primary h-full rounded-t relative z-10"></div>
              </div>
              <p className="text-label-sm uppercase font-bold text-primary">DocChat Engine</p>
              <p className="text-xs text-on-surface-variant italic">Precise fact extraction</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
