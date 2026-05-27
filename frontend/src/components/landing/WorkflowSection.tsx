import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const steps = [
  { icon: 'upload_file', title: 'PDF Upload', desc: 'Multi-modal parsing engine.' },
  { icon: 'data_object', title: 'Parsing', desc: 'Layout aware extraction.' },
  { icon: 'splitscreen', title: 'Chunking', desc: 'Semantic context grouping.' },
  { icon: 'dynamic_form', title: 'Embeddings', desc: 'High-dimensional vectors.' },
  { icon: 'database', title: 'Vector DB', desc: 'Cloud-native persistence.' },
  { icon: 'search_insights', title: 'Hybrid', desc: 'Semantic + Keyword.' },
  { icon: 'filter_list', title: 'Reranking', desc: 'Contextual relevance score.' },
  { icon: 'auto_awesome', title: 'AI Gen', desc: 'Source-cited responses.', highlight: true },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const WorkflowSection = () => {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7 }}
        className="mb-16"
      >
        <h2 className="text-4xl font-headline text-on-surface mb-4">The Intelligent Lifecycle</h2>
        <p className="text-on-surface-variant max-w-xl">
          Every document is precision-engineered for retrieval, from ingestion to generation.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="relative grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4"
      >
        {/* SVG Dashed Connector Line — exactly as in Stitch */}
        <svg
          className="absolute top-1/2 left-0 w-full h-1 z-0 hidden lg:block"
          preserveAspectRatio="none"
          style={{ opacity: 0.2 }}
        >
          <defs>
            <linearGradient id="lineGrad" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#acc7ff" />
              <stop offset="100%" stopColor="#508ff8" />
            </linearGradient>
          </defs>
          <line
            stroke="url(#lineGrad)"
            strokeDasharray="8 4"
            strokeWidth="2"
            x1="0"
            x2="100%"
            y1="0"
            y2="0"
          />
        </svg>

        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            variants={cardVariants}
            whileHover={{
              backgroundColor: 'rgba(30, 31, 37, 0.8)',
              scale: 1.04,
              borderColor: step.highlight ? 'rgba(172,199,255,0.5)' : 'rgba(255,255,255,0.1)',
              boxShadow: step.highlight
                ? '0 0 24px rgba(80,143,248,0.25)'
                : '0 8px 32px rgba(0,0,0,0.3)',
              transition: { duration: 0.2 },
            }}
            className={`glass-panel p-6 rounded-2xl relative z-10 group transition-colors cursor-default ${
              step.highlight ? 'border border-primary/20' : ''
            }`}
          >
            <motion.span
              className="material-symbols-outlined text-primary mb-4 block"
              whileHover={{ scale: 1.2, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {step.icon}
            </motion.span>
            <h3 className="text-sm font-bold mb-1 text-on-surface">{step.title}</h3>
            <p className="text-xs text-on-surface-variant">{step.desc}</p>

            {/* Step number badge */}
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-surface-container-highest/60 flex items-center justify-center">
              <span className="text-[9px] font-bold text-primary">{i + 1}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default WorkflowSection;
