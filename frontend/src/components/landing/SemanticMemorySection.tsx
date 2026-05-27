import React from 'react';
import { motion } from 'framer-motion';

const cards = [
  {
    icon: 'neurology',
    title: 'Concept Mapping',
    desc: 'Linking related ideas across thousands of document pages automatically.',
    delay: 0,
  },
  {
    icon: 'memory',
    title: 'Long-term Memory',
    desc: 'A persistent knowledge graph that grows with every document you upload.',
    delay: 0.15,
  },
  {
    icon: 'share_reviews',
    title: 'Contextual Flow',
    desc: 'Smooth conversation transitions with awareness of past document queries.',
    delay: 0.3,
  },
];

const SemanticMemorySection = () => {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-16"
      >
        <h2 className="text-5xl font-headline text-on-surface">Semantic Memory Graph</h2>
        <p className="text-on-surface-variant mt-4 max-w-2xl mx-auto">
          We don't just split text. We understand concepts. Our semantic chunking engine breaks
          documents into logic blocks that preserve the author's intent.
        </p>
      </motion.div>

      <div className="relative h-[500px] glass-panel rounded-3xl overflow-hidden group">
        <img
          className="w-full h-full object-cover opacity-30 grayscale group-hover:scale-105 transition-transform duration-700"
          alt="Futuristic neural network visualization"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCS6UKz9Rm606SipeBY1WFcCxRGesJOjpmF6FcGo-VTvM0NVtFU6sVDznw9N_33gYN8Oj173oOQKjvUUtquIkdHY7g6dYwSVEp-6c7dd7sTtXhRdvglkf3k_ZaTg3VTkDAtkok60x68E7kUCLbmybkccMZNjhsYZEfEzhj-qLmkF4w4OQyof9ptmPFxYIScnGHwxZme2JLvSDCZVcN6qSl3SOvTfn3RiII2xs-XfRHG71o8f59exiQxeTzHMfdQf-jV3uvMFqvrrdI"
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl w-full">
            {cards.map((card) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: card.delay, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="p-8 glass-panel rounded-2xl animate-float"
                style={{ animationDelay: `${card.delay}s` }}
              >
                <span className="material-symbols-outlined text-4xl text-primary mb-4 block">
                  {card.icon}
                </span>
                <h4 className="font-bold text-xl mb-2 text-on-surface">{card.title}</h4>
                <p className="text-sm text-on-surface-variant">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SemanticMemorySection;
