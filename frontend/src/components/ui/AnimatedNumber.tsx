"use client";

import clsx from "clsx";
import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { formatNumber } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  fractionDigits?: number;
  duration?: number;
  signed?: boolean;
  className?: string;
}

export function AnimatedNumber({ value, fractionDigits = 0, duration = 1.4, signed = false, className }: AnimatedNumberProps) {
  const node = useRef<HTMLSpanElement>(null);
  const displayed = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const render = (current: number) => {
      displayed.current = current;
      const text = formatNumber(Math.abs(current), fractionDigits);
      const isZero = text === formatNumber(0, fractionDigits);
      const sign = isZero ? "" : current < 0 ? "−" : signed ? "+" : "";
      element.textContent = sign + text;
    };
    if (reduceMotion) {
      render(value);
      return;
    }
    const controls = animate(displayed.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: render,
    });
    return () => controls.stop();
  }, [value, fractionDigits, duration, signed, reduceMotion]);

  return (
    <span ref={node} className={clsx("tabular-nums", className)}>
      {formatNumber(0, fractionDigits)}
    </span>
  );
}
