"use client";

import { useEffect, useState } from "react";

export function RotatingWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span key={words[index]} className="animate-rise-in inline-block text-accent">
      {words[index]}
    </span>
  );
}
