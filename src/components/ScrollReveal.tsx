"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Scroll-triggered reveal — fades/slides content up into place the first
// time it enters the viewport, instead of everything firing on page load.
// Same visual pattern used by most modern marketing sites (this one was
// modeled after alethia.earth's scroll reveals, a Framer-built site —
// their animation engine is proprietary, so this is a from-scratch
// IntersectionObserver implementation of the same well-known effect, not
// extracted code).
export function ScrollReveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
