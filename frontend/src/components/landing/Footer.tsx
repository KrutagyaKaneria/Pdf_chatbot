import React from 'react';
import { motion } from 'framer-motion';

const footerLinks = ['Documentation', 'API Reference', 'Status', 'Privacy Policy'];

const Footer = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
      className="bg-surface-container-lowest w-full py-12 flex flex-col md:flex-row justify-between items-center px-12 border-t border-outline-variant/10 mt-24"
    >
      <div className="mb-8 md:mb-0 text-center md:text-left">
        <div className="font-display text-xl text-on-surface mb-2">Atelier AI</div>
        <p className="font-body text-xs uppercase tracking-widest text-on-surface-variant">
          © 2024 Digital Atelier. All rights reserved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {footerLinks.map(link => (
          <motion.a
            key={link}
            href="#"
            whileHover={{ color: '#acc7ff' }}
            className="font-body text-xs uppercase tracking-widest text-on-surface-variant transition-colors"
          >
            {link}
          </motion.a>
        ))}
      </div>
    </motion.footer>
  );
};

export default Footer;
