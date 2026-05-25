import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import WorkflowSection from '../components/landing/WorkflowSection';
import ComparisonSection from '../components/landing/ComparisonSection';
import SemanticMemorySection from '../components/landing/SemanticMemorySection';
import InfrastructureSection from '../components/landing/InfrastructureSection';
import DemoSection from '../components/landing/DemoSection';
import Footer from '../components/landing/Footer';

const LandingPage = () => {
  useEffect(() => {
    // Scroll Reveal Logic
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));
    
    return () => {
        elements.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="dark antialiased bg-background text-on-surface font-body overflow-x-hidden min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <WorkflowSection />
        <ComparisonSection />
        <SemanticMemorySection />
        <InfrastructureSection />
        <DemoSection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
