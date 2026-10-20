import type { CSSProperties } from "react";

interface Blob {
  className: string;
  color: string;
  dx: string;
  dy: string;
  duration: string;
  delay: string;
}

const BLOBS: Blob[] = [
  { className: "-left-[10%] -top-[15%] h-[55vmax] w-[55vmax]", color: "rgb(46 230 184 / 0.13)", dx: "12%", dy: "8%", duration: "38s", delay: "0s" },
  { className: "-right-[15%] top-[5%] h-[50vmax] w-[50vmax]", color: "rgb(139 124 255 / 0.16)", dx: "-10%", dy: "10%", duration: "44s", delay: "-12s" },
  { className: "bottom-[-25%] left-[20%] h-[45vmax] w-[45vmax]", color: "rgb(255 107 107 / 0.10)", dx: "8%", dy: "-10%", duration: "50s", delay: "-24s" },
  { className: "bottom-[-10%] right-[5%] h-[30vmax] w-[30vmax]", color: "rgb(56 130 255 / 0.10)", dx: "-6%", dy: "-8%", duration: "36s", delay: "-6s" },
];

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-ink-950">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#0e1530_0%,transparent_60%)]" />
      {BLOBS.map((blob) => (
        <div
          key={blob.color}
          className={`aurora-blob ${blob.className}`}
          style={
            {
              background: `radial-gradient(circle at center, ${blob.color}, transparent 65%)`,
              "--dx": blob.dx,
              "--dy": blob.dy,
              "--duration": blob.duration,
              "--delay": blob.delay,
            } as CSSProperties
          }
        />
      ))}
      <div className="noise absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(140%_100%_at_50%_40%,transparent_55%,rgb(0_0_0/0.55)_100%)]" />
    </div>
  );
}
