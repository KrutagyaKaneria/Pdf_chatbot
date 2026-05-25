import React, { useEffect, useRef } from 'react';
import ArchNavbar from '../components/architecture/ArchNavbar';
import ArchHeroSection from '../components/architecture/ArchHeroSection';
import InfrastructureLattice from '../components/architecture/InfrastructureLattice';
import LivingPipeline from '../components/architecture/LivingPipeline';
import RetrievalHeatmap from '../components/architecture/RetrievalHeatmap';
import ArchFooter from '../components/architecture/ArchFooter';

const ArchitecturePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // 1. Neural Background with Scroll Response
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: {x: number, y: number, size: number, speedX: number, speedY: number, opacity: number}[] = [];
    let scrollPos = 0;
    let animationFrameId: number;

    function initCanvas() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          size: Math.random() * 2 + 0.5,
          speedX: Math.random() * 0.4 - 0.2,
          speedY: Math.random() * 0.4 - 0.2,
          opacity: Math.random() * 0.3 + 0.1
        });
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const offsetY = scrollPos * 0.05;
      
      ctx!.fillStyle = '#acc7ff';
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0 || p.x > canvas!.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas!.height) p.speedY *= -1;
        
        ctx!.globalAlpha = p.opacity;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y + offsetY, p.size, 0, Math.PI * 2);
        ctx!.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    }

    const handleScroll = () => {
      scrollPos = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', initCanvas);
    initCanvas();
    animate();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', initCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="min-h-screen selection:bg-primary/30 selection:text-primary relative overflow-x-hidden bg-background">
      {/* Neural Background */}
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-full h-full -z-10 transition-transform duration-100 ease-out"
        style={{ background: 'radial-gradient(circle at 50% 50%, #1a1b21 0%, #0c0e13 100%)' }}
      ></canvas>

      <ArchNavbar />
      <ArchHeroSection />
      <InfrastructureLattice />
      <LivingPipeline />
      <RetrievalHeatmap />
      <ArchFooter />
    </div>
  );
};

export default ArchitecturePage;
