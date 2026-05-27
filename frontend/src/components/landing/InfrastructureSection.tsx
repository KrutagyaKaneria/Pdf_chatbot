import React from 'react';
import { motion } from 'framer-motion';

const techCards = [
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJ_ysZHxLmfYJAIs0rA7W7aA7ulgUj2ZSvdSSFroYiGCXldZ4iM_7de1JEq5poPHSWKMcaybcrEixLaZAn_GY8rcvhtH_--Tal4PtAxYAiq4vU_0iprnZa4En4Vz3UCSmYwXvhsw-ltfRfooyUk02xmzIP4JMp9dFmxAYNcCSgff65rsBfDV6J-u3BUUs7SxCdQrbjDtwAY_3W9lSCdHRs8YDjgPP64Bicxe5EkI5xEzNA-uThLwcdhuRiNPK_Av5iyoUvsOt0oVM',
    name: 'PGVector',
    desc: 'SQL-native vector storage for seamless relational and semantic queries.',
    offset: false,
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvaWPZRSng5iZU4UfqBxCEVuelI96a5eGlIvLzpMThEUPjMXrTVdP-suN7rXNAVChbeG35-CDxiIyQor1LBIR8LQ65DXebv6074eqt6ebaXEkruuk6c0FeUkorM72QAvOSHg5ZiwqchBAAFUtntoJ2xailzzSARN25lFrPKPEEHegzO9A7o1TqxhtTjppQIA1MXc_1D4Xohmk_3G2VlX1fT9ZMw4bumkrAGymlw1DGpQrRI9KSa049vaAn7c3VJu2ZMZ89MFajDFI',
    name: 'Groq LLM',
    desc: 'Unrivaled inference speed powered by LPU architecture for instant responses.',
    offset: true,
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCO3D2zXU8AAfiP0eTnMsJMkMhpbePT2GcJCg6HjKzUv3IM0NTBtDvSL2yvyOLeywoUbgqkFs55fnCWg-2sEWtK4pHjx0beHAAJQANk4yeAXvdJp4mBYpFJDCSbWOaSJqyHYBhJ3QcHoYCJksup-O7zY4E0qc9XDcAR9wW7skHArXme5GvVRx_WkWCBgWa5I2KzMFQd4zoesF9eup3eaEfEZkLTeOd6haNuTvpCIszltmw98OjV0pYuldJlQTP5pGFa7GXL0lDOnmw',
    name: 'Redis Stack',
    desc: 'Global low-latency caching for session management and prompt templates.',
    offset: false,
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlNkh19yeJ1Oufc5UwlVh1ubxzK2-LU3u-KsM7TbfPbd06BIcTl_MnNimth8DjPBsaZ8RzCD8J63kv_Y31nsUK26bpS1NB9gtSgKARjIjZmRDFup5Fjy6lHOoKVGjHQmpThqkpIN0YpJzcAkckNoblrBxrLmLjrAx8LWzT3FGHhpr7Z_WTpq_fE8JmSYPutzw8r3hof11UFp6nc_DjMgrlqEc8eSaDBlLY-kmlXntfoLA0tu8iDY6cPL5CKN-CxO21qGA7g0AEip4',
    name: 'LangChain',
    desc: 'Advanced orchestration of agents and complex multi-step reasoning chains.',
    offset: true,
  },
];

const InfrastructureSection = () => {
  return (
    <section className="py-24 bg-surface-container-lowest px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8"
        >
          <div className="max-w-xl">
            <h2 className="text-4xl font-headline text-on-surface mb-4">
              Enterprise Grade Infrastructure
            </h2>
            <p className="text-on-surface-variant">
              Built on the most robust technologies in the AI ecosystem for unmatched reliability and speed.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04, backgroundColor: 'rgba(172,199,255,0.1)' }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-3 rounded-full border border-outline-variant/30 text-primary font-bold transition-all"
          >
            Technical Docs
          </motion.button>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {techCards.map((card, i) => (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: card.offset ? 16 : 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{
                backgroundColor: 'rgba(40,42,47,0.9)',
                y: card.offset ? 8 : -8,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                transition: { duration: 0.25 },
              }}
              className={`glass-panel p-8 rounded-3xl transition-all ${card.offset ? 'lg:translate-y-4' : ''}`}
            >
              <img
                className="w-full h-32 object-cover rounded-xl mb-6 opacity-60"
                alt={card.name}
                src={card.img}
              />
              <h3 className="text-xl font-bold mb-2 text-on-surface">{card.name}</h3>
              <p className="text-sm text-on-surface-variant">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InfrastructureSection;
