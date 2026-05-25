import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-surface-container-lowest w-full py-12 flex flex-col md:flex-row justify-between items-center px-12 border-t border-outline-variant/10 mt-24">
      <div className="mb-8 md:mb-0 text-center md:text-left">
        <div className="font-headline text-xl text-on-surface mb-2">Atelier AI</div>
        <p className="font-body text-label-sm uppercase tracking-widest text-on-surface-variant">© 2024 Digital Atelier. All rights reserved.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        <a className="font-body text-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all" href="#">Documentation</a>
        <a className="font-body text-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all" href="#">API Reference</a>
        <a className="font-body text-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all" href="#">Status</a>
        <a className="font-body text-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all" href="#">Privacy Policy</a>
      </div>
    </footer>
  );
};

export default Footer;
