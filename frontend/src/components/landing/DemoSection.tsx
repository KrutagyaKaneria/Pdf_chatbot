import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const DemoSection = () => {
  const [typedText, setTypedText] = useState('');
  const [showList, setShowList] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const fullContent = `Based on the <span class="text-primary font-bold">Q3 Financial Report (p. 42)</span>, the revenue growth in EMEA was driven by three primary factors:`;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let timeoutId: NodeJS.Timeout;

    const typeWriter = (i: number) => {
      if (i < fullContent.length) {
        if (fullContent[i] === '<') {
          const tagEnd = fullContent.indexOf('>', i);
          setTypedText(prev => prev + fullContent.substring(i, tagEnd + 1));
          timeoutId = setTimeout(() => typeWriter(tagEnd + 1), 15);
        } else {
          setTypedText(prev => prev + fullContent.charAt(i));
          timeoutId = setTimeout(() => typeWriter(i + 1), 15);
        }
      } else {
        setTimeout(() => setShowList(true), 200);
        setTimeout(() => setShowCitations(true), 600);
      }
    };

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !hasStarted.current) {
        hasStarted.current = true;
        timeoutId = setTimeout(() => typeWriter(0), 300);
      }
    }, { threshold: 0.4 });

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section className="py-24 px-6 max-w-5xl mx-auto" ref={sectionRef}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-3xl p-1 border border-primary/10 overflow-hidden shadow-2xl"
      >
        {/* Window chrome */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-highest/50 border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-error/40" />
            <div className="w-3 h-3 rounded-full bg-tertiary/40" />
            <div className="w-3 h-3 rounded-full bg-primary/40" />
            <span className="ml-4 text-sm font-medium text-on-surface-variant">
              Chat: Q3_Financial_Review.pdf
            </span>
          </div>
          <span className="text-xs text-on-surface-variant/60 hidden sm:block">
            Connected to 128-core Inference Node
          </span>
        </div>

        {/* Chat area */}
        <div className="p-8 h-[500px] overflow-y-auto space-y-8 bg-surface-container-lowest/80 backdrop-blur-3xl custom-scrollbar">
          {/* User message */}
          <div className="flex justify-end">
            <div className="bg-primary/10 p-4 rounded-2xl rounded-tr-none max-w-md border border-primary/5">
              <p className="text-sm">
                What were the key drivers for revenue growth in the EMEA region last quarter?
              </p>
            </div>
          </div>

          {/* AI response */}
          <div className="flex gap-4">
            <div className="flex-none w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-xl">smart_toy</span>
            </div>
            <div className="space-y-4 max-w-2xl">
              <div className="bg-surface-container-high p-6 rounded-2xl rounded-tl-none border border-outline-variant/5">
                <p
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: typedText }}
                />
                {showList && (
                  <motion.ul
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-4 space-y-2 text-sm text-on-surface-variant"
                  >
                    <li className="flex gap-2">
                      <span className="text-primary">01.</span>
                      Expansion of the cloud services portfolio in Germany.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">02.</span>
                      Strategic acquisition of 'Digital Solutions Ltd' in August.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">03.</span>
                      15% increase in annual recurring revenue (ARR) from existing enterprise clients.
                    </li>
                  </motion.ul>
                )}
              </div>

              {/* Citations */}
              {showCitations && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-wrap gap-2"
                >
                  {[
                    { icon: 'description', label: 'Page 42, Para 3' },
                    { icon: 'table_chart', label: 'Exhibit A: Revenue Breakdown' },
                  ].map(c => (
                    <motion.div
                      key={c.label}
                      whileHover={{ borderColor: 'rgba(172,199,255,0.5)', scale: 1.03 }}
                      className="px-3 py-1 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center gap-2 text-xs cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">{c.icon}</span>
                      {c.label}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Pulse indicator */}
          <div className="flex gap-4 items-center opacity-60">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary node-pulse" />
            </div>
            <div className="h-2 w-32 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary/40 shimmer" />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-6 bg-surface-container-high/40 border-t border-outline-variant/10">
          <div className="relative">
            <input
              className="w-full bg-surface-container-highest/50 border-0 border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-2xl px-6 py-4 text-sm transition-all placeholder:text-on-surface-variant/40 text-on-surface"
              placeholder="Ask a question about your documents..."
              type="text"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default DemoSection;
