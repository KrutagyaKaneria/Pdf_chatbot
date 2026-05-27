import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HeroSection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: {
      x: number; y: number; size: number;
      speedX: number; speedY: number; opacity: number;
    }[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize, { passive: true });
    resize();

    const init = () => {
      particles = [];
      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          speedX: Math.random() * 0.5 - 0.25,
          speedY: Math.random() * 0.5 - 0.25,
          opacity: Math.random() * 0.5,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;

        ctx.fillStyle = `rgba(172, 199, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.strokeStyle = `rgba(172, 199, 255, ${0.1 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 hero-gradient pt-24">
      {/* Canvas background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <canvas ref={canvasRef} className="w-full h-full" id="hero-canvas" />
      </div>

      {/* Radial glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-outline-variant/20 bg-surface-container-low/50 backdrop-blur-md"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-on-surface-variant font-medium">
            Production RAG Engine
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-headline leading-[0.9] text-on-surface tracking-tight"
        >
          Next-Generation AI <br />
          <span className="italic text-primary">Document Intelligence</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed font-body"
        >
          Production-grade RAG. Hybrid Retrieval. Advanced Document Understanding.{' '}
          Transform static data into active intelligence with the world's most sophisticated retrieval platform.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-col md:flex-row gap-4 justify-center pt-8"
        >
          <Link to="/signup">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 0 28px rgba(172,199,255,0.35)' }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-lg transition-all"
            >
              Get Started
            </motion.button>
          </Link>
          <Link to="/architecture">
            <motion.button
              whileHover={{ scale: 1.04, backgroundColor: 'rgba(30,31,37,0.8)' }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-full border border-outline-variant/30 text-on-surface font-semibold transition-all flex items-center justify-center gap-2 group"
            >
              View Architecture
              <motion.span
                className="material-symbols-outlined text-sm"
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
              >
                arrow_forward
              </motion.span>
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce"
      >
        <span className="material-symbols-outlined text-3xl">keyboard_double_arrow_down</span>
      </motion.div>
    </section>
  );
};

export default HeroSection;
