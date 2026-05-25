import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl flex justify-between items-center px-8 py-4 max-w-7xl mx-auto left-1/2 -translate-x-1/2">
      <div className="font-headline text-2xl font-bold tracking-tight bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent">
        Atelier AI
      </div>
      <div className="hidden md:flex items-center gap-8">
        <a className="text-primary font-bold border-b-2 border-primary pb-1 transition-colors duration-300" href="#">Platform</a>
        <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300" href="#">Retrieval</a>
        <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300" href="#">Solutions</a>
        <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300" href="#">Pricing</a>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/signup" className="hidden md:block px-6 py-2 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold scale-95 active:opacity-80 transition-all hover:shadow-[0_0_15px_rgba(172,199,255,0.4)]">
          Get Started
        </Link>
        <button className="md:hidden text-on-surface">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
