// Motifs décoratifs du CV et de la lettre. Une seule géométrie (en mm) sert à la fois
// à l'aperçu (SVG) et au PDF (jsPDF), pour que les deux soient identiques.

export type MotifId = "aucun" | "points" | "lignes" | "losanges" | "vagues";

export const MOTIFS: { id: MotifId; name: string }[] = [
  { id: "aucun", name: "Aucun" },
  { id: "points", name: "Points" },
  { id: "lignes", name: "Lignes" },
  { id: "losanges", name: "Losanges" },
  { id: "vagues", name: "Vagues" },
];

export type Shape =
  | { t: "circle"; cx: number; cy: number; r: number }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number }
  | { t: "poly"; pts: [number, number][] };

export function isMotif(v: unknown): v is MotifId {
  return MOTIFS.some((m) => m.id === v);
}

/** Formes du motif pour un rectangle (x, y, w, h) en mm. Les formes peuvent déborder : le dessin est découpé au rectangle. */
export function motifShapes(id: MotifId, x: number, y: number, w: number, h: number): Shape[] {
  const out: Shape[] = [];
  switch (id) {
    case "points": {
      const step = 4.2;
      for (let row = 0, yy = y + step / 2; yy < y + h + step; yy += step, row++) {
        for (let xx = x + (row % 2 ? step / 2 : 0); xx < x + w + step; xx += step) {
          out.push({ t: "circle", cx: xx, cy: yy, r: 0.45 });
        }
      }
      break;
    }
    case "lignes": {
      const gap = 3.2;
      for (let k = -h; k < w + h; k += gap) {
        out.push({ t: "line", x1: x + k, y1: y + h, x2: x + k + h, y2: y });
      }
      break;
    }
    case "losanges": {
      // Treillis de losanges, inspiré des tissages d'Afrique de l'Ouest.
      const dx = 7;
      const dy = 9;
      for (let row = 0, cy = y; cy < y + h + dy; cy += dy / 2, row++) {
        for (let cx = x + (row % 2 ? dx / 2 : 0); cx < x + w + dx; cx += dx) {
          out.push({ t: "poly", pts: [[cx, cy - dy / 2 + 0.9], [cx + dx / 2 - 0.9, cy], [cx, cy + dy / 2 - 0.9], [cx - dx / 2 + 0.9, cy]] });
        }
      }
      break;
    }
    case "vagues": {
      const gap = 4.5;
      const amp = 1.1;
      const period = 9;
      for (let yy = y + gap / 2; yy < y + h + gap; yy += gap) {
        const pts: [number, number][] = [];
        for (let xx = x - period; xx <= x + w + period; xx += 0.75) {
          pts.push([xx, yy + Math.sin(((xx - x) / period) * Math.PI * 2) * amp]);
        }
        for (let i = 1; i < pts.length; i++) {
          out.push({ t: "line", x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1] });
        }
      }
      break;
    }
  }
  return out;
}

/** Dessin SVG (unités mm) pour l'aperçu à l'écran. */
export function motifSvg(id: MotifId, w: number, h: number, color: string): string {
  if (id === "aucun") return "";
  const parts = motifShapes(id, 0, 0, w, h).map((s) => {
    if (s.t === "circle") return `<circle cx="${s.cx.toFixed(2)}" cy="${s.cy.toFixed(2)}" r="${s.r}" fill="${color}"/>`;
    if (s.t === "line") return `<line x1="${s.x1.toFixed(2)}" y1="${s.y1.toFixed(2)}" x2="${s.x2.toFixed(2)}" y2="${s.y2.toFixed(2)}"/>`;
    return `<polygon points="${s.pts.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" ")}" fill="none"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" stroke="${color}" stroke-width="0.32" stroke-linecap="round">${parts.join("")}</svg>`;
}

export function motifDataUrl(id: MotifId, w: number, h: number, color: string): string {
  const svg = motifSvg(id, w, h, color);
  return svg ? `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` : "none";
}

/** Dessin dans un PDF jsPDF, découpé au rectangle. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function drawMotif(pdf: any, id: MotifId, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  if (id === "aucun") return;
  pdf.saveGraphicsState();
  // Découpe légèrement en retrait : évite un liseré du motif au bord du bandeau.
  const inset = 0.5;
  pdf.rect(x + inset, y + inset, w - inset * 2, h - inset * 2, null);
  pdf.clip();
  pdf.discardPath();
  pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
  pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
  pdf.setLineWidth(0.32);
  for (const s of motifShapes(id, x, y, w, h)) {
    if (s.t === "circle") pdf.circle(s.cx, s.cy, s.r, "F");
    else if (s.t === "line") pdf.line(s.x1, s.y1, s.x2, s.y2);
    else {
      for (let i = 0; i < s.pts.length; i++) {
        const a = s.pts[i];
        const b = s.pts[(i + 1) % s.pts.length];
        pdf.line(a[0], a[1], b[0], b[1]);
      }
    }
  }
  pdf.restoreGraphicsState();
}
