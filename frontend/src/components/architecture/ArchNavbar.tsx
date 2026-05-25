import React from 'react';
import { Link } from 'react-router-dom';

const ArchNavbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12)]">
      <div className="flex justify-between items-center px-12 h-20 w-full mx-auto">
        <Link to="/" className="font-headline text-2xl font-semibold text-on-surface tracking-tighter hover:text-primary transition-colors">
          DocChat
        </Link>
        <div className="hidden md:flex items-center gap-12">
          <Link to="/" className="font-body text-base text-on-surface-variant hover:text-on-surface transition-colors">Documents</Link>
          <span className="font-body text-base text-primary font-bold border-b-2 border-primary pb-1 cursor-default">Architecture</span>
          <Link to="/app" className="font-body text-base text-on-surface-variant hover:text-on-surface transition-colors">Workspace</Link>
          <a className="font-body text-base text-on-surface-variant hover:text-on-surface transition-colors" href="#">Templates</a>
        </div>
        <div className="flex items-center gap-6">
          <button className="material-symbols-outlined text-on-surface-variant hover:bg-surface-bright/10 p-2 rounded-full transition-all">notifications</button>
          <button className="material-symbols-outlined text-on-surface-variant hover:bg-surface-bright/10 p-2 rounded-full transition-all">settings</button>
          <Link to="/signup" className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold px-6 py-2 rounded-full active:scale-95 transition-transform hover:shadow-[0_0_15px_rgba(172,199,255,0.4)]">
            Upgrade
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default ArchNavbar;
