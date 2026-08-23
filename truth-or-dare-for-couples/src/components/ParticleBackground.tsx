import React, { useMemo } from 'react';

export const ParticleBackground: React.FC = () => {
  // Generate random fixed particles for glowing ambient embers/fireflies
  const particles = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 5 + 2,
      duration: Math.random() * 10 + 6,
      delay: Math.random() * 5,
      color: i % 3 === 0 ? '#FF6B9D' : i % 3 === 1 ? '#D4AF37' : '#7A1F2B',
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#1a1a1a]">
      {/* Elegant Dark Bokeh Lights */}
      <div className="bokeh w-[500px] h-[500px] bg-[#7A1F2B] -top-24 -left-24 opacity-25" />
      <div className="bokeh w-[400px] h-[400px] bg-[#FF6B9D] -bottom-16 -right-16 opacity-20" />
      <div className="bokeh w-[350px] h-[350px] bg-[#D4AF37] top-[20%] right-[10%] opacity-15" />

      {/* Wine Radial Center Gradient Overlay */}
      <div
        className="absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(circle at center, #4a121a 0%, #1a1a1a 100%)' }}
      />

      {/* Subtle Card Grid Texture overlay */}
      <div className="absolute inset-0 card-pattern opacity-15" />

      {/* Floating Light Firefly Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-slow"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
