import clsx from "clsx";
import type { ComponentPropsWithoutRef, ElementType } from "react";

type GlassCardProps<T extends ElementType> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

export function GlassCard<T extends ElementType = "div">({ as, className, ...props }: GlassCardProps<T>) {
  const Component = as ?? "div";
  return <Component className={clsx("glass", className)} {...props} />;
}

export function CardTitle({ eyebrow, title, className }: { eyebrow?: string; title: string; className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {eyebrow && <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">{eyebrow}</span>}
      <h2 className="font-display text-base font-medium tracking-tight text-fg">{title}</h2>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("shimmer rounded-xl", className)} />;
}
