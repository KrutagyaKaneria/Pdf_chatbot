import React from 'react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const ComparisonSection = () => {
  return (
    <section className="py-24 bg-surface-container-low px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Text side */}
        <motion.div
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="space-y-8"
        >
          <motion.h2 variants={fadeUp} className="text-5xl font-headline text-on-surface">
            Beyond Naive Retrieval
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-on-surface-variant leading-relaxed">
            Basic chatbots lose context in long documents. DocChat uses{' '}
            <span className="text-primary font-bold">Hybrid Reranking</span> and{' '}
            <span className="text-primary font-bold">Recursive Summarization</span> to ensure every
            answer is grounded in the ground truth.
          </motion.p>
          <motion.ul variants={fadeUp} className="space-y-6">
            {[
              {
                icon: 'check_circle',
                title: 'Zero Hallucination Guarantee',
                desc: 'Every response is hard-linked to specific PDF coordinates and text chunks.',
              },
              {
                icon: 'bolt',
                title: 'Sub-Second Latency',
                desc: 'Engineered for enterprise scale with distributed vector search and caching.',
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-4">
                <div className="flex-none w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">{item.title}</h4>
                  <p className="text-on-surface-variant text-sm">{item.desc}</p>
                </div>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Visualization side */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative glass-panel rounded-3xl p-8 aspect-square flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-surface-container-highest/20" />
          <div className="z-10 grid grid-cols-2 gap-8 w-full">
            {/* Naive RAG */}
            <div className="space-y-4 text-center">
              <div className="h-48 bg-surface-container rounded-xl flex items-end justify-center p-4 gap-2">
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1, origin: 'bottom' }}
                  className="w-4 bg-error/20 h-1/4 rounded-t origin-bottom"
                />
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2, origin: 'bottom' }}
                  className="w-4 bg-error/20 h-2/4 rounded-t origin-bottom"
                />
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3, origin: 'bottom' }}
                  className="w-4 bg-error/40 h-1/3 rounded-t origin-bottom"
                />
              </div>
              <p className="text-xs uppercase font-bold text-error">Naive RAG</p>
              <p className="text-xs text-on-surface-variant italic">High hallucination risk</p>
            </div>

            {/* DocChat */}
            <div className="space-y-4 text-center">
              <div className="h-48 bg-surface-container-highest rounded-xl flex items-end justify-center p-4 gap-2 relative overflow-hidden">
                <div className="absolute inset-0 shimmer opacity-20 rounded-xl" />
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="w-4 bg-primary/60 h-2/3 rounded-t origin-bottom"
                />
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="w-4 bg-primary/80 h-4/5 rounded-t origin-bottom"
                />
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="w-4 bg-primary h-full rounded-t origin-bottom"
                />
              </div>
              <p className="text-xs uppercase font-bold text-primary">DocChat Engine</p>
              <p className="text-xs text-on-surface-variant italic">Precise fact extraction</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ComparisonSection;
