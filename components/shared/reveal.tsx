"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type RevealDirection = "up" | "down" | "left" | "right";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  direction?: RevealDirection;
  className?: string;
};

const offsets: Record<
  RevealDirection,
  { x: number; y: number }
> = {
  up: { x: 0, y: 48 },
  down: { x: 0, y: -48 },
  left: { x: -72, y: 0 },
  right: { x: 72, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const offset = offsets[direction];

  return (
    <motion.div
      className={[
        "reveal-motion",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      initial={{
        opacity: 0,
        x: offset.x,
        y: offset.y,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.15,
      }}
      transition={{
        duration: reduceMotion ? 0 : 0.7,
        delay: reduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}