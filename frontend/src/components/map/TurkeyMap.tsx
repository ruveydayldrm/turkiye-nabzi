"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { geoMercator, geoPath } from "d3-geo";
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { MapTooltip } from "@/components/map/MapTooltip";
import type { ProvinceCollection } from "@/hooks/useProvinceShapes";
import { provinceValue, type ProvinceValue } from "@/lib/selectors";
import { sentimentColor } from "@/lib/sentiment";
import type { CategoryId, Dataset } from "@/lib/types";

const WIDTH = 1000;
const HEIGHT = 450;
const INSUFFICIENT_FILL = "#141a2c";

interface Shape {
  plate: string;
  name: string;
  d: string;
  centroidX: number;
}

interface TurkeyMapProps {
  shapes: ProvinceCollection;
  dataset: Dataset;
  category: CategoryId;
  day: number;
  selected: string | null;
  compare: string[] | null;
  onSelect: (plate: string) => void;
}

interface Hover {
  plate: string;
  name: string;
  x: number;
  y: number;
  width: number;
}

export function TurkeyMap({ shapes, dataset, category, day, selected, compare, onSelect }: TurkeyMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const geometry = useMemo<Shape[]>(() => {
    const projection = geoMercator().fitExtent(
      [
        [8, 8],
        [WIDTH - 8, HEIGHT - 8],
      ],
      shapes,
    );
    const path = geoPath(projection);
    return shapes.features.map((feature) => ({
      plate: feature.properties.plate,
      name: feature.properties.name,
      d: path(feature) ?? "",
      centroidX: path.centroid(feature)[0],
    }));
  }, [shapes]);

  const values = useMemo(() => {
    const map = new Map<string, ProvinceValue>();
    for (const shape of geometry) map.set(shape.plate, provinceValue(dataset, shape.plate, category, day));
    return map;
  }, [geometry, dataset, category, day]);

  const highlighted = new Set([selected, ...(compare ?? [])].filter(Boolean) as string[]);
  const hovered = hover ? geometry.find((shape) => shape.plate === hover.plate) : undefined;

  const trackPointer = (event: PointerEvent, shape: Shape) => {
    if (event.pointerType === "touch") return;
    const bounds = container.current?.getBoundingClientRect();
    if (!bounds) return;
    setHover({ plate: shape.plate, name: shape.name, x: event.clientX - bounds.left, y: event.clientY - bounds.top, width: bounds.width });
  };

  const fillFor = (value: ProvinceValue | undefined) =>
    value?.sufficient ? sentimentColor(value.score) : INSUFFICIENT_FILL;

  return (
    <div ref={container} className="relative w-full" onPointerLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Türkiye illeri duygu haritası"
      >
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(255 255 255 / 0.16)" strokeWidth="1.3" />
          </pattern>
          <filter id="map-shadow" x="-10%" y="-10%" width="120%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#000" floodOpacity="0.55" />
          </filter>
        </defs>

        <g filter="url(#map-shadow)">
          {geometry.map((shape) => {
            const value = values.get(shape.plate);
            return (
              <path
                key={shape.plate}
                d={shape.d}
                className="province-in cursor-pointer outline-none"
                style={
                  {
                    fill: fillFor(value),
                    stroke: "rgb(5 7 15 / 0.85)",
                    strokeWidth: 0.7,
                    transition: "fill 600ms var(--ease-smooth), opacity 300ms",
                    opacity: hover && hover.plate !== shape.plate ? 0.82 : 1,
                    "--delay": `${Math.round((shape.centroidX / WIDTH) * 700)}ms`,
                  } as CSSProperties
                }
                tabIndex={0}
                aria-label={shape.name}
                onPointerEnter={(event) => trackPointer(event, shape)}
                onPointerMove={(event) => trackPointer(event, shape)}
                onClick={() => onSelect(shape.plate)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(shape.plate);
                }}
              />
            );
          })}
        </g>

        <g pointerEvents="none">
          {geometry.map((shape) => (
            <path
              key={shape.plate}
              d={shape.d}
              fill="url(#hatch)"
              style={{ opacity: values.get(shape.plate)?.sufficient ? 0 : 1, transition: "opacity 600ms var(--ease-smooth)" }}
            />
          ))}
        </g>

        <g pointerEvents="none">
          {geometry
            .filter((shape) => highlighted.has(shape.plate))
            .map((shape) => (
              <path
                key={shape.plate}
                d={shape.d}
                fill="none"
                stroke={compare?.includes(shape.plate) && compare[0] !== shape.plate ? "#f5b971" : "#ffffff"}
                strokeWidth={1.8}
                strokeLinejoin="round"
                className={clsx(compare && "animate-pulse")}
              />
            ))}
        </g>

        <AnimatePresence>
          {hovered && (
            <motion.path
              key={hovered.plate}
              d={hovered.d}
              pointerEvents="none"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.045, opacity: 1 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fill: fillFor(values.get(hovered.plate)),
                stroke: "rgb(255 255 255 / 0.9)",
                strokeWidth: 1.2,
                transformBox: "fill-box",
                originX: 0.5,
                originY: 0.5,
                filter: `drop-shadow(0 0 10px ${fillFor(values.get(hovered.plate))}) drop-shadow(0 8px 14px rgb(0 0 0 / 0.6))`,
              }}
            />
          )}
        </AnimatePresence>
      </svg>

      <AnimatePresence>
        {hover && (
          <MapTooltip
            key="tooltip"
            name={hover.name}
            plate={hover.plate}
            value={values.get(hover.plate)}
            x={hover.x}
            y={hover.y}
            containerWidth={hover.width}
            minArticles={dataset.minArticles}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
