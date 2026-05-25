import React from 'react';

const InfrastructureSection = () => {
  return (
    <section className="py-24 bg-surface-container-lowest px-6 reveal">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-xl">
            <h2 className="text-4xl font-headline text-on-surface mb-4">Enterprise Grade Infrastructure</h2>
            <p className="text-on-surface-variant">Built on the most robust technologies in the AI ecosystem for unmatched reliability and speed.</p>
          </div>
          <button className="px-6 py-3 rounded-full border border-outline-variant/30 text-primary font-bold hover:bg-primary/10 transition-all">
            Technical Docs
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-panel p-8 rounded-3xl hover:bg-surface-container-high transition-all">
            <img 
                className="w-full h-32 object-cover rounded-xl mb-6 opacity-60" 
                alt="PGVector" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJ_ysZHxLmfYJAIs0rA7W7aA7ulgUj2ZSvdSSFroYiGCXldZ4iM_7de1JEq5poPHSWKMcaybcrEixLaZAn_GY8rcvhtH_--Tal4PtAxYAiq4vU_0iprnZa4En4Vz3UCSmYwXvhsw-ltfRfooyUk02xmzIP4JMp9dFmxAYNcCSgff65rsBfDV6J-u3BUUs7SxCdQrbjDtwAY_3W9lSCdHRs8YDjgPP64Bicxe5EkI5xEzNA-uThLwcdhuRiNPK_Av5iyoUvsOt0oVM"
            />
            <h3 className="text-xl font-bold mb-2 text-on-surface">PGVector</h3>
            <p className="text-sm text-on-surface-variant">SQL-native vector storage for seamless relational and semantic queries.</p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl hover:bg-surface-container-high transition-all lg:translate-y-4">
            <img 
                className="w-full h-32 object-cover rounded-xl mb-6 opacity-60" 
                alt="Groq LLM" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvaWPZRSng5iZU4UfqBxCEVuelI96a5eGlIvLzpMThEUPjMXrTVdP-suN7rXNAVChbeG35-CDxiIyQor1LBIR8LQ65DXebv6074eqt6ebaXEkruuk6c0FeUkorM72QAvOSHg5ZiwqchBAAFUtntoJ2xailzzSARN25lFrPKPEEHegzO9A7o1TqxhtTjppQIA1MXc_1D4Xohmk_3G2VlX1fT9ZMw4bumkrAGymlw1DGpQrRI9KSa049vaAn7c3VJu2ZMZ89MFajDFI"
            />
            <h3 className="text-xl font-bold mb-2 text-on-surface">Groq LLM</h3>
            <p className="text-sm text-on-surface-variant">Unrivaled inference speed powered by LPU architecture for instant responses.</p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl hover:bg-surface-container-high transition-all">
            <img 
                className="w-full h-32 object-cover rounded-xl mb-6 opacity-60" 
                alt="Redis Stack" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCO3D2zXU8AAfiP0eTnMsJMkMhpbePT2GcJCg6HjKzUv3IM0NTBtDvSL2yvyOLeywoUbgqkFs55fnCWg-2sEWtK4pHjx0beHAAJQANk4yeAXvdJp4mBYpFJDCSbWOaSJqyHYBhJ3QcHoYCJksup-O7zY4E0qc9XDcAR9wW7skHArXme5GvVRx_WkWCBgWa5I2KzMFQd4zoesF9eup3eaEfEZkLTeOd6haNuTvpCIszltmw98OjV0pYuldJlQTP5pGFa7GXL0lDOnmw"
            />
            <h3 className="text-xl font-bold mb-2 text-on-surface">Redis Stack</h3>
            <p className="text-sm text-on-surface-variant">Global low-latency caching for session management and prompt templates.</p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl hover:bg-surface-container-high transition-all lg:translate-y-4">
            <img 
                className="w-full h-32 object-cover rounded-xl mb-6 opacity-60" 
                alt="LangChain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlNkh19yeJ1Oufc5UwlVh1ubxzK2-LU3u-KsM7TbfPbd06BIcTl_MnNimth8DjPBsaZ8RzCD8J63kv_Y31nsUK26bpS1NB9gtSgKARjIjZmRDFup5Fjy6lHOoKVGjHQmpThqkpIN0YpJzcAkckNoblrBxrLmLjrAx8LWzT3FGHhpr7Z_WTpq_fE8JmSYPutzw8r3hof11UFp6nc_DjMgrlqEc8eSaDBlLY-kmlXntfoLA0tu8iDY6cPL5CKN-CxO21qGA7g0AEip4"
            />
            <h3 className="text-xl font-bold mb-2 text-on-surface">LangChain</h3>
            <p className="text-sm text-on-surface-variant">Advanced orchestration of agents and complex multi-step reasoning chains.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfrastructureSection;
