import React from 'react';

const ArchFooter = () => {
  return (
    <footer className="w-full mt-auto py-16 px-12 bg-surface-container-lowest border-t border-white/5 relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-screen-2xl mx-auto">
        <div className="font-headline text-lg text-on-surface-variant">DocChat Digital Atelier.</div>
        
        <div className="flex gap-8">
          <a className="font-body text-xs tracking-wide uppercase text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Privacy Policy</a>
          <a className="font-body text-xs tracking-wide uppercase text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Terms of Service</a>
          <a className="font-body text-xs tracking-wide uppercase text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">API Documentation</a>
          <a className="font-body text-xs tracking-wide uppercase text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Support</a>
        </div>
        
        <p className="font-body text-xs tracking-wide uppercase text-on-surface-variant/50 italic text-center md:text-right">
          © 2024 DocChat Digital Atelier. Designed for editorial intelligence.
        </p>
      </div>
    </footer>
  );
};

export default ArchFooter;
