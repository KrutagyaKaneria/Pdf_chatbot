import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ArchNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-surface/80 backdrop-blur-2xl shadow-[0_1px_0_rgba(255,255,255,0.05)]'
            : 'bg-surface/70 backdrop-blur-2xl'
        }`}
      >
        <div className="flex justify-between items-center px-12 h-20 w-full mx-auto max-w-screen-2xl">
          {/* Logo */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="font-headline text-2xl font-semibold text-on-surface tracking-tighter hover:text-primary transition-colors"
            >
              DocChat
            </motion.div>
          </Link>

          {/* Active page indicator */}
          <div className="hidden md:flex items-center gap-2 bg-surface-container-high/40 backdrop-blur-xl border border-white/5 px-5 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-label uppercase tracking-widest text-on-surface">
              Architecture View
            </span>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="hidden md:block px-5 py-2 text-on-surface-variant font-medium hover:text-primary transition-colors"
              >
                Login
              </motion.button>
            </Link>
            <Link to="/signup">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(172,199,255,0.35)' }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold px-6 py-2 rounded-full transition-all"
              >
                Sign Up
              </motion.button>
            </Link>
            <button
              className="md:hidden text-on-surface p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-20 left-0 w-full z-40 bg-surface/95 backdrop-blur-2xl border-b border-outline-variant/20 py-6 px-8 flex flex-col gap-4 md:hidden"
          >
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <button className="w-full text-left py-3 text-on-surface-variant font-medium">Login</button>
            </Link>
            <Link to="/signup" onClick={() => setMobileOpen(false)}>
              <button className="w-full py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold">
                Sign Up
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ArchNavbar;
