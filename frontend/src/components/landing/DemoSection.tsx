import React, { useEffect, useRef, useState } from 'react';

const DemoSection = () => {
  const [typedText, setTypedText] = useState('');
  const textRef = useRef<HTMLDivElement>(null);

  const fullContent = `Based on the <span class="text-primary font-bold">Q3 Financial Report (p. 42)</span>, the revenue growth in EMEA was driven by three primary factors:`;

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    let i = 0;
    let isTyping = false;
    let timeoutId: NodeJS.Timeout;

    const typeWriter = () => {
      if (i < fullContent.length) {
        if (fullContent[i] === '<') {
          const tagEnd = fullContent.indexOf('>', i);
          setTypedText((prev) => prev + fullContent.substring(i, tagEnd + 1));
          i = tagEnd + 1;
        } else {
          setTypedText((prev) => prev + fullContent.charAt(i));
          i++;
        }
        timeoutId = setTimeout(typeWriter, 15);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isTyping) {
        isTyping = true;
        setTypedText('');
        i = 0;
        typeWriter();
      }
    }, { threshold: 0.5 });

    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section className="py-24 px-6 max-w-5xl mx-auto reveal">
      <div className="glass-panel rounded-3xl p-1 border border-primary/10 overflow-hidden shadow-2xl">
        {/* Chat Window Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-highest/50 border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-error/40"></div>
            <div className="w-3 h-3 rounded-full bg-tertiary/40"></div>
            <div className="w-3 h-3 rounded-full bg-primary/40"></div>
            <span className="ml-4 text-sm font-medium text-on-surface-variant">Chat: Q3_Financial_Review.pdf</span>
          </div>
          <span className="text-xs text-on-surface-variant/60 hidden sm:block">Connected to 128-core Inference Node</span>
        </div>
        
        {/* Chat Content Area */}
        <div className="p-4 sm:p-8 h-[500px] overflow-y-auto space-y-8 bg-surface-container-lowest/80 backdrop-blur-3xl custom-scrollbar">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="bg-primary/10 p-4 rounded-2xl rounded-tr-none max-w-md border border-primary/5">
              <p className="text-sm">What were the key drivers for revenue growth in the EMEA region last quarter?</p>
            </div>
          </div>
          
          {/* AI Message */}
          <div className="flex gap-4">
            <div className="flex-none w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary-container">
              <span className="material-symbols-outlined text-xl">smart_toy</span>
            </div>
            
            <div className="space-y-4 max-w-2xl" ref={textRef}>
              <div className="bg-surface-container-high p-6 rounded-2xl rounded-tl-none border border-outline-variant/5">
                <p 
                    className="text-sm leading-relaxed min-h-[40px]" 
                    dangerouslySetInnerHTML={{ __html: typedText }}
                ></p>
                
                {typedText.length === fullContent.length && (
                    <ul className="mt-4 space-y-2 text-sm text-on-surface-variant animate-[opacity_0.5s_ease-in]">
                    <li className="flex gap-2"><span className="text-primary">01.</span> Expansion of the cloud services portfolio in Germany.</li>
                    <li className="flex gap-2"><span className="text-primary">02.</span> Strategic acquisition of 'Digital Solutions Ltd' in August.</li>
                    <li className="flex gap-2"><span className="text-primary">03.</span> 15% increase in annual recurring revenue (ARR) from existing enterprise clients.</li>
                    </ul>
                )}
              </div>
              
              {/* Citations */}
              {typedText.length === fullContent.length && (
                  <div className="flex flex-wrap gap-2 animate-[opacity_0.5s_ease-in]">
                    <div className="px-3 py-1 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center gap-2 text-xs hover:border-primary transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-[14px]">description</span>
                        Page 42, Para 3
                    </div>
                    <div className="px-3 py-1 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center gap-2 text-xs hover:border-primary transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-[14px]">table_chart</span>
                        Exhibit A: Revenue Breakdown
                    </div>
                  </div>
              )}
            </div>
          </div>
          
          {/* Intelligence Pulse */}
          <div className="flex gap-4 items-center opacity-60">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary node-pulse"></div>
            </div>
            <div className="h-2 w-32 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary/40 shimmer"></div>
            </div>
          </div>
        </div>
        
        {/* Input Area */}
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
      </div>
    </section>
  );
};

export default DemoSection;
