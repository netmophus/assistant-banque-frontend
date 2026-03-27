'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
  duration?: number;
}

export default function ScrollReveal({ 
  children, 
  delay = 0, 
  className = '',
  direction = 'up',
  duration = 700
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              if (entry.target) {
                entry.target.classList.add('opacity-100', 'translate-y-0', 'translate-x-0');
                entry.target.classList.remove('opacity-0');
                
                // Remove direction-specific classes
                entry.target.classList.remove('translate-y-8', '-translate-y-8', 'translate-x-8', '-translate-x-8');
              }
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (ref.current) {
      // Set initial state based on direction
      ref.current.classList.add('opacity-0', 'transition-all', 'duration-700', 'ease-out');
      
      switch (direction) {
        case 'up':
          ref.current.classList.add('translate-y-8');
          break;
        case 'down':
          ref.current.classList.add('-translate-y-8');
          break;
        case 'left':
          ref.current.classList.add('translate-x-8');
          break;
        case 'right':
          ref.current.classList.add('-translate-x-8');
          break;
        case 'fade':
          // Just opacity, no translation
          break;
      }
      
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay, direction, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

