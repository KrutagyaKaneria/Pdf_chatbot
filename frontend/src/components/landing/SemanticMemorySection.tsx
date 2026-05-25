import React from 'react';

const SemanticMemorySection = () => {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto reveal">
      <div className="text-center mb-16">
        <h2 className="text-5xl font-headline text-on-surface">Semantic Memory Graph</h2>
        <p className="text-on-surface-variant mt-4 max-w-2xl mx-auto">We don't just split text. We understand concepts. Our semantic chunking engine breaks documents into logic blocks that preserve the author's intent.</p>
      </div>
      
      <div className="relative h-[500px] glass-panel rounded-3xl overflow-hidden group">
        <img 
            className="w-full h-full object-cover opacity-30 grayscale group-hover:scale-105 transition-transform duration-700" 
            alt="Futuristic digital visualization" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCS6UKz9Rm606SipeBY1WFcCxRGesJOjpmF6FcGo-VTvM0NVtFU6sVDznw9N_33gYN8Oj173oOQKjvUUtquIkdHY7g6dYwSVEp-6c7dd7sTtXhRdvglkf3k_ZaTg3VTkDAtkok60x68E7kUCLbmybkccMZNjhsYZEfEzhj-qLmkF4w4OQyof9ptmPFxYIScnGHwxZme2JLvSDCZVcN6qSl3SOvTfn3RiII2xs-XfRHG71o8f59exiQxeTzHMfdQf-jV3uvMFqvrrdI"
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl w-full">
            <div className="p-8 glass-panel rounded-2xl animate-float" style={{ animationDelay: '0s' }}>
              <span className="material-symbols-outlined text-4xl text-primary mb-4">neurology</span>
              <h4 className="font-bold text-xl mb-2 text-on-surface">Concept Mapping</h4>
              <p className="text-sm text-on-surface-variant">Linking related ideas across thousands of document pages automatically.</p>
            </div>
            
            <div className="p-8 glass-panel rounded-2xl animate-float" style={{ animationDelay: '0.5s' }}>
              <span className="material-symbols-outlined text-4xl text-primary mb-4">memory</span>
              <h4 className="font-bold text-xl mb-2 text-on-surface">Long-term Memory</h4>
              <p className="text-sm text-on-surface-variant">A persistent knowledge graph that grows with every document you upload.</p>
            </div>
            
            <div className="p-8 glass-panel rounded-2xl animate-float" style={{ animationDelay: '1s' }}>
              <span className="material-symbols-outlined text-4xl text-primary mb-4">share_reviews</span>
              <h4 className="font-bold text-xl mb-2 text-on-surface">Contextual Flow</h4>
              <p className="text-sm text-on-surface-variant">Smooth conversation transitions with awareness of past document queries.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SemanticMemorySection;
