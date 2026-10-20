#!/usr/bin/env node
/**
 * Normalises the open-source province GeoJSON (github.com/cihadturhan/tr-geojson):
 * attaches plate codes, fixes ring winding for d3-geo and trims coordinate precision.
 *
 * Usage: node scripts/prepare-geo.mjs <input.json>
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea } from "d3-geo";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] ?? path.join(ROOT, "public", "geo", "raw.json");
const output = path.join(ROOT, "public", "geo", "turkey-provinces.json");

const ALIASES = { Afyon: "Afyonkarahisar" };

const provinces = JSON.parse(await readFile(path.join(ROOT, "src", "data", "provinces.json"), "utf8"));
const plateByName = new Map(provinces.map((p) => [p.name.toLocaleLowerCase("tr"), p.plate]));
const geo = JSON.parse(await readFile(input, "utf8"));

const round = (ring) => ring.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);

const features = geo.features.map((feature) => {
  const rawName = feature.properties.name;
  const name = ALIASES[rawName] ?? rawName;
  const plate = plateByName.get(name.toLocaleLowerCase("tr"));
  if (!plate) throw new Error(`No plate for "${rawName}"`);

  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const fixed = polygons.map((rings) => {
    const polygon = { type: "Polygon", coordinates: rings.map(round) };
    return geoArea(polygon) > 2 * Math.PI ? polygon.coordinates.map((ring) => [...ring].reverse()) : polygon.coordinates;
  });

  return {
    type: "Feature",
    id: plate,
    properties: { plate, name },
    geometry: fixed.length === 1 ? { type: "Polygon", coordinates: fixed[0] } : { type: "MultiPolygon", coordinates: fixed },
  };
});

if (new Set(features.map((f) => f.id)).size !== 81) throw new Error("Expected 81 unique provinces");

await writeFile(output, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`Wrote ${features.length} provinces → ${path.relative(ROOT, output)}`);
