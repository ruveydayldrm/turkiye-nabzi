#!/usr/bin/env node
/**
 * Generates a deterministic, realistic-looking 30-day dataset for demo mode.
 *
 * Usage: node scripts/generate-demo-data.mjs [--seed=20261020] [--end=2026-10-20]
 * Output: public/demo/dataset.json and public/demo/provinces/{plate}.json
 *
 * The output mirrors the backend API contract (see src/lib/types.ts), so the
 * frontend renders demo and live data through the same code path.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "demo");

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")),
);

const DAYS = 30;
const SEED = Number(args.seed ?? 20261020);
const END_DATE = args.end ?? new Date().toISOString().slice(0, 10);
const DAILY_VOLUME = 1800;
const MIN_ARTICLES = 5;
const WINDOW_DAYS = 3;
const SHRINKAGE_K = 4;
const SCORE_SPREAD = 0.2;

const provinces = JSON.parse(
  await readFile(path.join(ROOT, "src", "data", "provinces.json"), "utf8"),
);

// ---------------------------------------------------------------- randomness

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const gauss = (sd = 1) => {
  let u = 0;
  while (u === 0) u = rand();
  return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};
const poisson = (lambda) => {
  if (lambda <= 0) return 0;
  if (lambda > 40) return Math.max(0, Math.round(lambda + gauss(Math.sqrt(lambda))));
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rand();
  } while (p > limit);
  return k - 1;
};
const pick = (items) => items[Math.floor(rand() * items.length)];
const pickWeighted = (entries) => {
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries.at(-1)[0];
};
const clamp = (x, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, x));
const round3 = (x) => Math.round(x * 1000) / 1000;

// ------------------------------------------------------------ turkish suffix

const BACK_VOWELS = "aıou";
const FRONT_VOWELS = "eiöü";
const VOWELS = BACK_VOWELS + FRONT_VOWELS;
const HARD_CONSONANTS = "fstkçşhp";
const NARROW = { a: "ı", ı: "ı", o: "u", u: "u", e: "i", i: "i", ö: "ü", ü: "ü" };

function withSuffix(name, kind) {
  const word = name.toLocaleLowerCase("tr");
  const lastVowel = [...word].reverse().find((ch) => VOWELS.includes(ch)) ?? "e";
  const lastChar = word.at(-1);
  const endsWithVowel = VOWELS.includes(lastChar);
  const wide = BACK_VOWELS.includes(lastVowel) ? "a" : "e";
  const d = HARD_CONSONANTS.includes(lastChar) ? "t" : "d";
  switch (kind) {
    case "de":
      return `${name}'${d}${wide}`;
    case "den":
      return `${name}'${d}${wide}n`;
    case "in":
      return `${name}'${endsWithVowel ? "n" : ""}${NARROW[lastVowel]}n`;
    case "e":
      return `${name}'${endsWithVowel ? "y" : ""}${wide}`;
    default:
      return name;
  }
}

const fill = (template, name) =>
  template.replace(/\{(il|de|den|in|e)\}/g, (_, kind) => withSuffix(name, kind));

// ---------------------------------------------------------------- categories

const CATEGORIES = {
  ekonomi: { share: 0.24, mean: -0.12, label: "ekonomi" },
  spor: { share: 0.16, mean: 0.12, label: "spor" },
  asayis: { share: 0.2, mean: -0.55, label: "asayiş" },
  "kultur-sanat": { share: 0.09, mean: 0.38, label: "kültür-sanat" },
  egitim: { share: 0.1, mean: 0.05, label: "eğitim" },
  saglik: { share: 0.11, mean: -0.08, label: "sağlık" },
  "hava-cevre": { share: 0.1, mean: -0.15, label: "hava ve çevre" },
};
const CATEGORY_IDS = Object.keys(CATEGORIES);

const CATEGORY_BIAS = {
  "61": { spor: 1.9 },
  "34": { spor: 1.3, ekonomi: 1.2 },
  "26": { "kultur-sanat": 1.7, egitim: 1.3 },
  "50": { "kultur-sanat": 1.9 },
  "17": { "kultur-sanat": 1.6 },
  "07": { "kultur-sanat": 1.4, "hava-cevre": 1.2 },
  "48": { "kultur-sanat": 1.3, "hava-cevre": 1.3 },
  "41": { ekonomi: 1.6 },
  "16": { ekonomi: 1.5 },
  "27": { ekonomi: 1.6 },
  "38": { ekonomi: 1.4 },
  "20": { ekonomi: 1.4 },
  "06": { ekonomi: 1.3, egitim: 1.3 },
  "42": { saglik: 1.2, egitim: 1.2 },
};
const REGION_BIAS = { karadeniz: { "hava-cevre": 1.4 } };

function categoryWeight(province, category, dayIndex, dayOfWeek) {
  const own = CATEGORY_BIAS[province.plate]?.[category] ?? 1;
  const regional = REGION_BIAS[province.region]?.[category] ?? 1;
  const weekend = dayOfWeek === 0 || dayOfWeek === 6;
  const weekly = weekend
    ? { spor: 1.5, ekonomi: 0.7, egitim: 0.6, "kultur-sanat": 1.2 }[category] ?? 1
    : 1;
  return CATEGORIES[category].share * own * regional * weekly;
}

// ------------------------------------------------------------------- stories

const TEMPLATES = {
  ekonomi: {
    pos: [
      "{de} yeni organize sanayi bölgesi için ilk kazma vuruldu",
      "{in} ihracatı geçen yılın aynı dönemine göre yüzde 18 arttı",
      "{de} kadın kooperatifinin ürünleri yurt dışına açılıyor",
      "{de} düzenlenen istihdam fuarına yoğun ilgi",
    ],
    neg: [
      "{de} tekstil fabrikası kapandı, yüzlerce işçi tedirgin",
      "{de} kira artışları esnafı zorluyor",
      "{de} çiftçiler artan girdi maliyetlerinden şikâyetçi",
    ],
    neu: [
      "{in} esnafı yeni dönem kampanyasına hazırlanıyor",
      "{de} belediye bütçesi meclis gündeminde",
    ],
  },
  spor: {
    pos: [
      "{il} temsilcisi deplasmandan 3 puanla döndü",
      "{il} kökenli milli sporcu Avrupa şampiyonu oldu",
      "{de} yeni spor kompleksi hizmete açıldı",
    ],
    neg: [
      "{il} ekibi sahasında mağlup oldu, taraftar tepkili",
      "{de} amatör lig maçında saha karıştı",
    ],
    neu: [
      "{il} temsilcisi yeni sezon kadrosunu tamamladı",
      "{de} gençlik ligi fikstürü açıklandı",
    ],
  },
  asayis: {
    pos: [
      "{de} kaybolan çocuk 6 saat sonra sağ bulundu",
      "{de} dolandırıcılık şebekesi çökertildi",
    ],
    neg: [
      "{de} zincirleme trafik kazası: 4 yaralı",
      "{de} iş yerinde çıkan yangın korkuttu",
      "{de} hırsızlık olaylarında artış endişesi",
    ],
    neu: [
      "{de} trafik denetimleri sıklaştırıldı",
      "{in} merkezine yeni güvenlik kameraları kuruluyor",
    ],
  },
  "kultur-sanat": {
    pos: [
      "{de} uluslararası film festivali başladı",
      "{in} tarihi çarşısı restorasyonla yeniden canlandı",
      "{de} kazıda 2 bin yıllık mozaik gün yüzüne çıktı",
    ],
    neg: [
      "{de} tarihi konak bakımsızlıktan çökme tehlikesiyle karşı karşıya",
      "{de} merakla beklenen konser iptal edildi",
    ],
    neu: [
      "{de} kent müzesi kış programını açıkladı",
      "{de} yerel yazarlar buluşması düzenlenecek",
    ],
  },
  egitim: {
    pos: [
      "{de} öğrenciler bilim olimpiyatında birinci oldu",
      "{de} 3 yeni okul eğitime başladı",
    ],
    neg: [
      "{de} okullarda derslik sıkıntısı sürüyor",
      "{de} öğrenci servis ücretlerine yapılan zamma tepki",
    ],
    neu: [
      "{de} yeni dönem için öğretmen atamaları tamamlandı",
      "{de} üniversite yeni bölüm açmaya hazırlanıyor",
    ],
  },
  saglik: {
    pos: [
      "{de} yeni hastane hasta kabulüne başladı",
      "{de} organ nakliyle bir hayat daha kurtarıldı",
    ],
    neg: [
      "{de} grip vakalarında artış, acil servisler doldu",
      "{de} hastane randevularında bekleme süreleri uzadı",
    ],
    neu: [
      "{de} ücretsiz sağlık taraması yapılacak",
      "{il} İl Sağlık Müdürlüğünden mevsim geçişi uyarısı",
    ],
  },
  "hava-cevre": {
    pos: [
      "{de} ağaçlandırma seferberliği: 50 bin fidan toprakla buluştu",
      "{in} hava kalitesi son ayların en iyi seviyesinde",
    ],
    neg: [
      "{de} sağanak su baskınlarına neden oldu",
      "{de} hava kirliliği alarm seviyesine ulaştı",
      "{de} çıkan orman yangınına müdahale sürüyor",
    ],
    neu: [
      "{il} için kuvvetli rüzgâr uyarısı yapıldı",
      "{de} hafta sonu sıcaklıklar mevsim normallerinde seyredecek",
    ],
  },
};

const KEYWORDS = {
  ekonomi: ["ihracat", "yatırım", "enflasyon", "istihdam", "esnaf", "sanayi", "kira", "fiyat", "üretim", "kooperatif", "maaş"],
  spor: ["maç", "gol", "taraftar", "transfer", "lig", "teknik direktör", "deplasman", "galibiyet"],
  asayis: ["kaza", "polis", "operasyon", "yangın", "gözaltı", "trafik", "jandarma"],
  "kultur-sanat": ["festival", "konser", "sergi", "müze", "tiyatro", "kazı", "restorasyon"],
  egitim: ["okul", "öğrenci", "öğretmen", "üniversite", "sınav", "burs", "derslik"],
  saglik: ["hastane", "doktor", "aşı", "grip", "acil servis", "randevu", "tarama"],
  "hava-cevre": ["yağış", "fırtına", "sıcaklık", "orman", "fidan", "kirlilik", "rüzgâr"],
};

const SOURCES = ["Kent Postası", "Yerel Gündem", "Bölge Bülteni", "Ekonomi Hattı", "Spor Kulvarı", "Haber Pusulası", "Şehir Ekranı"];

// Narrative events make the time slider worth playing: day indices are 0..DAYS-1.
const ALL_PLATES = provinces.map((p) => p.plate);
const EVENTS = [
  {
    plates: ["41", "16"],
    category: "ekonomi",
    from: 2,
    to: 5,
    delta: 0.45,
    volume: 2,
    headlines: ["{de} 4 milyar liralık otomotiv yatırımı için imzalar atıldı", "{de} yeni yatırımla 3 bin kişiye istihdam"],
    keywords: ["otomotiv", "yatırım", "istihdam"],
    highlight: "{de} açıklanan büyük sanayi yatırımı gündemin merkezinde.",
  },
  {
    plates: ["53", "08", "61", "28"],
    category: "hava-cevre",
    from: 7,
    to: 10,
    delta: -0.6,
    volume: 4,
    headlines: ["{de} sel ve heyelan: köy yolları ulaşıma kapandı", "{de} sağanak sonrası evler tahliye edildi", "AFAD ekipleri {de} sel bölgesinde çalışıyor"],
    keywords: ["sel", "heyelan", "tahliye", "AFAD", "sağanak"],
    highlight: "{de} etkili olan sel ve heyelanlar gündemi belirliyor.",
  },
  {
    plates: ["42"],
    category: "saglik",
    from: 11,
    to: 12,
    delta: 0.5,
    volume: 2.5,
    headlines: ["{de} şehir hastanesinin yeni bloku hizmete açıldı"],
    keywords: ["şehir hastanesi", "yatak kapasitesi"],
    highlight: "{de} açılan yeni hastane bloku olumlu karşılandı.",
  },
  {
    plates: ["35", "48"],
    category: "hava-cevre",
    from: 13,
    to: 15,
    delta: -0.5,
    volume: 3,
    headlines: ["{de} orman yangını: ekipler gece boyunca müdahale etti", "{de} yangın bölgesinde hasar tespiti başladı"],
    keywords: ["orman yangını", "helikopter", "tahliye"],
    highlight: "{de} çıkan orman yangını ve sonrasındaki hasar tespiti öne çıkıyor.",
  },
  {
    plates: ["01"],
    category: "asayis",
    from: 16,
    to: 18,
    delta: -0.3,
    volume: 2,
    headlines: ["{de} geniş çaplı operasyon: çok sayıda gözaltı"],
    keywords: ["operasyon", "gözaltı"],
    highlight: "{de} asayiş operasyonları haber akışına yön veriyor.",
  },
  {
    plates: ["61"],
    category: "spor",
    from: 19,
    to: 21,
    delta: 0.6,
    volume: 3,
    headlines: ["{il} temsilcisi derbiden galip ayrıldı, kent sokaklara döküldü", "{de} galibiyet coşkusu sabaha kadar sürdü"],
    keywords: ["derbi", "galibiyet", "taraftar", "kutlama"],
    highlight: "{il} temsilcisinin derbi galibiyeti kentte büyük coşku yarattı.",
  },
  {
    plates: ["26", "50", "17"],
    category: "kultur-sanat",
    from: 21,
    to: 26,
    delta: 0.5,
    volume: 3,
    headlines: ["{de} sonbahar festivali on binlerce ziyaretçiyi ağırladı", "{de} festival kapsamında açık hava konserleri düzenlendi"],
    keywords: ["festival", "ziyaretçi", "konser", "turizm"],
    highlight: "{de} süren festival ziyaretçi rekoru kırıyor.",
  },
  {
    plates: ["27"],
    category: "ekonomi",
    from: 24,
    to: 28,
    delta: 0.45,
    volume: 2,
    headlines: ["{in} ihracatı aylık bazda rekor kırdı", "{il} sanayicisi yeni pazarlara açılıyor"],
    keywords: ["ihracat", "rekor", "sanayici"],
    highlight: "{in} rekor ihracat rakamları olumlu bir gündem oluşturuyor.",
  },
  {
    plates: ALL_PLATES,
    category: "egitim",
    from: 26,
    to: 27,
    delta: 0.3,
    volume: 1.5,
    headlines: ["{de} sınavda derece yapan öğrenciler ödüllendirildi"],
    keywords: ["sınav sonuçları", "derece", "öğrenci"],
    highlight: null,
  },
  {
    plates: ["25"],
    category: "ekonomi",
    from: 27,
    to: 29,
    delta: 0.35,
    volume: 2,
    headlines: ["{de} kayak sezonu öncesi otellerde doluluk yüzde 90'a ulaştı"],
    keywords: ["kayak", "turizm", "doluluk"],
    highlight: "{de} kış turizmi sezonu öncesi doluluk oranları sevindirici.",
  },
  {
    plates: ["06"],
    category: "ekonomi",
    from: 28,
    to: 29,
    delta: -0.3,
    volume: 1.6,
    headlines: ["{de} toplu taşımaya yapılan zam tartışma yarattı"],
    keywords: ["zam", "toplu taşıma", "ulaşım"],
    highlight: "{de} toplu taşıma zammı tartışmaları gündemde.",
  },
];

const activeEvents = (plate, category, day) =>
  EVENTS.filter((e) => e.category === category && e.from <= day && day <= e.to && e.plates.includes(plate));

// ---------------------------------------------------------------- simulation

const days = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(`${END_DATE}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (DAYS - 1 - i));
  return d.toISOString().slice(0, 10);
});

const totalWeight = provinces.reduce((acc, p) => acc + Math.pow(p.population, 0.7), 0);

const sim = provinces.map((province) => ({
  province,
  share: Math.pow(province.population, 0.7) / totalWeight,
  offset: gauss(0.07),
  walk: 0,
  categoryWalk: Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0])),
  raw: Object.fromEntries(CATEGORY_IDS.map((c) => [c, []])),
  count: Object.fromEntries(CATEGORY_IDS.map((c) => [c, []])),
}));

for (let t = 0; t < DAYS; t++) {
  const dayOfWeek = new Date(`${days[t]}T00:00:00Z`).getUTCDay();
  const nationalDrift = t >= DAYS - 7 ? 0.012 * (t - (DAYS - 7)) : -0.004 * Math.sin(t / 3);
  for (const s of sim) {
    s.walk = 0.85 * s.walk + gauss(0.035);
    for (const c of CATEGORY_IDS) {
      s.categoryWalk[c] = 0.8 * s.categoryWalk[c] + gauss(0.05);
      let lambda = DAILY_VOLUME * s.share * categoryWeight(s.province, c, t, dayOfWeek);
      let mean = CATEGORIES[c].mean + s.offset + s.walk + s.categoryWalk[c] + nationalDrift;
      for (const event of activeEvents(s.province.plate, c, t)) {
        lambda *= event.volume;
        mean += event.delta;
      }
      const n = poisson(lambda);
      s.count[c].push(n);
      s.raw[c].push(n > 0 ? clamp(mean + gauss(0.38 / Math.sqrt(n))) : null);
    }
  }
}

function weightedMean(pairs) {
  let total = 0;
  let weight = 0;
  for (const [value, w] of pairs) {
    if (value === null || w === 0) continue;
    total += value * w;
    weight += w;
  }
  return weight > 0 ? total / weight : null;
}

for (const s of sim) {
  s.raw.all = [];
  s.count.all = [];
  for (let t = 0; t < DAYS; t++) {
    s.count.all.push(CATEGORY_IDS.reduce((acc, c) => acc + s.count[c][t], 0));
    s.raw.all.push(weightedMean(CATEGORY_IDS.map((c) => [s.raw[c][t], s.count[c][t]])));
  }
}

const ALL_CATEGORY_IDS = ["all", ...CATEGORY_IDS];
const national = {};
for (const c of ALL_CATEGORY_IDS) {
  national[c] = { raw: [], n: [] };
  for (let t = 0; t < DAYS; t++) {
    national[c].n.push(sim.reduce((acc, s) => acc + s.count[c][t], 0));
    national[c].raw.push(round3(weightedMean(sim.map((s) => [s.raw[c][t], s.count[c][t]])) ?? 0));
  }
}

// Must match backend `scoring`: trailing window, shrinkage toward the national mean, tanh.
const windowRange = (t) => Array.from({ length: Math.min(WINDOW_DAYS, t + 1) }, (_, k) => t - k);

function windowed(raw, count, t) {
  const range = windowRange(t);
  return {
    raw: weightedMean(range.map((k) => [raw[k], count[k]])),
    n: range.reduce((acc, k) => acc + count[k], 0),
  };
}

function relativeScore({ raw, n }, nationalRaw) {
  if (raw === null || n === 0) return 0;
  const shrunk = (raw * n + nationalRaw * SHRINKAGE_K) / (n + SHRINKAGE_K);
  return round3(Math.tanh((shrunk - nationalRaw) / SCORE_SPREAD));
}

const provinceSeries = Object.fromEntries(sim.map((s) => [s.province.plate, {}]));
for (const c of ALL_CATEGORY_IDS) {
  for (const s of sim) provinceSeries[s.province.plate][c] = { s: [], n: [] };
  for (let t = 0; t < DAYS; t++) {
    const nationalWindow = windowed(national[c].raw, national[c].n, t).raw ?? 0;
    for (const s of sim) {
      const window = windowed(s.raw[c], s.count[c], t);
      provinceSeries[s.province.plate][c].s.push(relativeScore(window, nationalWindow));
      provinceSeries[s.province.plate][c].n.push(window.n);
    }
  }
}

// ------------------------------------------------------------------ details

const generatedAt = `${END_DATE}T14:05:00+03:00`;
const slugify = (text) =>
  text
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (ch) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[ch])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function buildHeadlines(s) {
  const name = s.province.name;
  const headlines = [];
  const seen = new Set();
  const lastDay = DAYS - 1;
  for (let attempt = 0; headlines.length < 6 && attempt < 40; attempt++) {
    const t = rand() < 0.65 ? lastDay : lastDay - 1;
    const weights = CATEGORY_IDS.map((c) => [c, s.count[c][t] + CATEGORIES[c].share]);
    const category = pickWeighted(weights);
    const events = activeEvents(s.province.plate, category, t);
    const base = s.raw[category][t] ?? CATEGORIES[category].mean;
    let title;
    let sentiment;
    if (events.length > 0 && rand() < 0.75) {
      title = fill(pick(events[0].headlines), name);
      sentiment = clamp(base + gauss(0.15));
    } else {
      sentiment = clamp(base + gauss(0.3));
      const tone = sentiment > 0.2 ? "pos" : sentiment < -0.2 ? "neg" : "neu";
      title = fill(pick(TEMPLATES[category][tone]), name);
    }
    if (seen.has(title)) continue;
    seen.add(title);
    const hour = t === lastDay ? 6 + Math.floor(rand() * 8) : 7 + Math.floor(rand() * 16);
    const minute = Math.floor(rand() * 60);
    headlines.push({
      title,
      url: `https://example.com/demo/${s.province.plate}/${slugify(title)}`,
      source: pick(SOURCES),
      category,
      sentiment: round3(sentiment),
      publishedAt: `${days[t]}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`,
    });
  }
  return headlines.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5);
}

function buildKeywords(s) {
  const weights = new Map();
  const add = (text, w) => weights.set(text, (weights.get(text) ?? 0) + w);
  for (const c of CATEGORY_IDS) {
    const total = s.count[c].reduce((a, b) => a + b, 0);
    for (const word of KEYWORDS[c]) add(word, total * (0.2 + rand()) / KEYWORDS[c].length);
  }
  for (const event of EVENTS) {
    if (!event.plates.includes(s.province.plate) || event.plates.length > 10) continue;
    const span = event.to - event.from + 1;
    const total = s.count[event.category].slice(event.from, event.to + 1).reduce((a, b) => a + b, 0);
    event.keywords.forEach((word, i) => add(word, (total / span) * (2.5 - i * 0.3)));
  }
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([text, weight]) => ({ text, weight: Math.max(1, Math.round(weight)) }));
}

function buildHighlights(s) {
  const lastDay = DAYS - 1;
  if (s.count.all[lastDay] < 8) return null;
  const name = s.province.name;
  const recentEvent = EVENTS.find(
    (e) => e.highlight && e.plates.includes(s.province.plate) && e.to >= lastDay - 2 && e.from <= lastDay,
  );
  const topCategory = CATEGORY_IDS.reduce((best, c) =>
    s.count[c][lastDay] > s.count[best][lastDay] ? c : best,
  );
  const sentences = [
    recentEvent
      ? fill(recentEvent.highlight, name)
      : `${fill("{in}", name)} gündeminde bugün en çok ${CATEGORIES[topCategory].label} haberleri konuşuldu.`,
  ];
  const score = provinceSeries[s.province.plate].all.s[lastDay];
  sentences.push(
    score > 0.25
      ? "Haberlerin genel tonu Türkiye ortalamasının belirgin şekilde üzerinde."
      : score < -0.25
        ? "Haberlerin genel tonu Türkiye ortalamasının altında seyrediyor."
        : "Haberlerin genel tonu Türkiye ortalamasına yakın.",
  );
  const recent = s.count.all.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const previous = s.count.all.slice(-10, -3).reduce((a, b) => a + b, 0) / 7;
  const change = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 0;
  if (Math.abs(change) >= 20) {
    sentences.push(`Son üç günde haber hacmi önceki haftaya göre %${Math.abs(change)} ${change > 0 ? "arttı" : "azaldı"}.`);
  }
  return sentences.join(" ");
}

// ------------------------------------------------------------------- output

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(path.join(OUT_DIR, "provinces"), { recursive: true });

const dataset = {
  generatedAt,
  isDemo: true,
  days,
  windowDays: WINDOW_DAYS,
  minArticles: MIN_ARTICLES,
  national,
  provinces: provinceSeries,
};
await writeFile(path.join(OUT_DIR, "dataset.json"), JSON.stringify(dataset));

for (const s of sim) {
  const detail = {
    plate: s.province.plate,
    generatedAt,
    headlines: buildHeadlines(s),
    keywords: buildKeywords(s),
    highlights: buildHighlights(s),
  };
  await writeFile(path.join(OUT_DIR, "provinces", `${s.province.plate}.json`), JSON.stringify(detail));
}

const today = national.all;
console.log(
  `Demo data: ${days[0]} → ${days.at(-1)}, ${provinces.length} provinces, ` +
    `${today.n.reduce((a, b) => a + b, 0).toLocaleString("tr-TR")} articles, ` +
    `national raw today ${today.raw.at(-1)} (seed ${SEED}).`,
);
