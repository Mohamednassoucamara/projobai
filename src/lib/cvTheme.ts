// Palette des couleurs de CV proposées au candidat, et outils de couleur partagés
// entre l'aperçu (HTML) et le PDF, pour que les deux soient identiques.

export const CV_COLORS = [
  { name: "Bleu marine", hex: "#1F3A5F" },
  { name: "Bleu", hex: "#1D5FA8" },
  { name: "Émeraude", hex: "#0F6E5A" },
  { name: "Bordeaux", hex: "#7A1F2B" },
  { name: "Anthracite", hex: "#2E3440" },
  { name: "Violet", hex: "#4B3B8F" },
  { name: "Terre cuite", hex: "#9A3F22" },
  { name: "Or", hex: "#8A6410" },
] as const;

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0x1f3a5f;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function luminance([r, g, b]: RGB) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Mélange une couleur avec du blanc (t = part de blanc, 0 à 1). */
export function tint(rgb: RGB, t: number): RGB {
  return rgb.map((v) => v + (255 - v) * t) as RGB;
}

/**
 * Couleur sûre pour le bandeau : un texte blanc doit y rester lisible
 * (contraste ≥ 4,5:1). Une couleur trop claire est assombrie automatiquement.
 */
export function safeAccent(hex: string): RGB {
  let rgb = hexToRgb(hex);
  for (let i = 0; i < 20 && 1.05 / (luminance(rgb) + 0.05) < 4.5; i++) {
    rgb = rgb.map((v) => v * 0.88) as RGB;
  }
  return rgb;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
