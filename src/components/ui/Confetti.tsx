'use client';

import { useEffect, useRef, useState } from 'react';

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
  duration?: number;
  particleCount?: number;
  colors?: string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'square' | 'triangle';
}

export function Confetti({ 
  trigger, 
  onComplete, 
  duration = 3000,
  particleCount = 150,
  colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6']
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles starting from bottom center
    const newParticles: Particle[] = [];
    const centerX = canvas.width / 2;
    const startY = canvas.height;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI / 3) + (Math.random() - 0.5) * (Math.PI / 2); // 60° ± 45°
      const speed = 5 + Math.random() * 10;
      
      newParticles.push({
        x: centerX + (Math.random() - 0.5) * 100, // Spread from center
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed - Math.random() * 5, // Upward velocity
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'triangle'
      });
    }

    setParticles(newParticles);
    startTimeRef.current = Date.now();

    // Animation loop
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - (startTimeRef.current || currentTime);
      
      if (elapsed > duration) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        setParticles([]);
        onComplete?.();
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      const updatedParticles = newParticles.map(particle => {
        // Apply gravity and air resistance
        const gravity = 0.3;
        const airResistance = 0.99;
        
        let newVx = particle.vx * airResistance;
        let newVy = particle.vy * airResistance + gravity;
        
        let newX = particle.x + newVx;
        let newY = particle.y + newVy;
        
        // Bounce off walls
        if (newX <= 0 || newX >= canvas.width) {
          newVx *= -0.8;
          newX = Math.max(0, Math.min(canvas.width, newX));
        }
        
        // Bounce off floor
        if (newY >= canvas.height) {
          newVy *= -0.6;
          newY = canvas.height;
          newVx *= 0.8; // Friction
        }

        // Draw particle
        ctx.save();
        ctx.translate(newX, newY);
        ctx.rotate(particle.rotation + particle.rotationSpeed * elapsed / 100);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);

        switch (particle.shape) {
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'square':
            ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -particle.size / 2);
            ctx.lineTo(-particle.size / 2, particle.size / 2);
            ctx.lineTo(particle.size / 2, particle.size / 2);
            ctx.closePath();
            ctx.fill();
            break;
        }

        ctx.restore();

        return {
          ...particle,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          rotation: particle.rotation + particle.rotationSpeed
        };
      });

      setParticles(updatedParticles);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trigger, duration, particleCount, colors, onComplete]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ display: particles.length > 0 ? 'block' : 'none' }}
    />
  );
}