import { Check, Palette, Shapes } from "lucide-react";
import { useCVData } from "../contexts/CVDataContext";
import { CV_COLORS, safeAccent, tint, rgbToHex } from "../../lib/cvTheme";
import { MOTIFS, motifDataUrl } from "../../lib/motifs";

/** Couleur commune au CV et à la lettre de motivation. */
export function ColorPicker({ note = "Le CV et la lettre utilisent la même couleur." }: { note?: string }) {
  const { cvData, updateCVData } = useCVData();
  const current = cvData.theme.toLowerCase();
  const isPreset = CV_COLORS.some((c) => c.hex.toLowerCase() === current);
  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="h-5 w-5 text-[#003087]" />
        <h3 className="text-lg font-bold text-slate-900">Couleur</h3>
      </div>
      <p className="text-sm text-slate-500 mb-4">{note}</p>
      <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="Couleur du document">
        {CV_COLORS.map((c) => {
          const selected = c.hex.toLowerCase() === current;
          return (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.name}
              title={c.name}
              onClick={() => updateCVData({ theme: c.hex })}
              className={`relative h-11 rounded-xl transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003087] ${selected ? "ring-2 ring-offset-2 ring-slate-900" : ""}`}
              style={{ background: c.hex }}
            >
              {selected && <Check className="h-5 w-5 text-white absolute inset-0 m-auto" />}
            </button>
          );
        })}
      </div>
      <label className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-slate-700 cursor-pointer">
        <span>Autre couleur</span>
        <span className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1 ${!isPreset ? "border-slate-900" : "border-slate-200"}`}>
          <input
            type="color"
            value={cvData.theme}
            onChange={(e) => updateCVData({ theme: e.target.value })}
            className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
            aria-label="Choisir une couleur personnalisée"
          />
          <span className="font-mono text-xs uppercase text-slate-500">{cvData.theme}</span>
        </span>
      </label>
      <p className="mt-2 text-xs text-slate-500">Une couleur trop claire est automatiquement assombrie pour que le texte reste lisible.</p>
    </div>
  );
}

/** Motif décoratif commun au CV et à la lettre. */
export function MotifPicker() {
  const { cvData, updateCVData } = useCVData();
  const accentRgb = safeAccent(cvData.theme);
  const accent = rgbToHex(accentRgb);
  const line = rgbToHex(tint(accentRgb, 0.3));
  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <Shapes className="h-5 w-5 text-[#003087]" />
        <h3 className="text-lg font-bold text-slate-900">Motif</h3>
      </div>
      <p className="text-sm text-slate-500 mb-4">Un décor discret dans la zone de couleur.</p>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Motif décoratif">
        {MOTIFS.map((m) => {
          const selected = cvData.motif === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => updateCVData({ motif: m.id })}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003087] ${selected ? "text-slate-900" : "text-slate-500 hover:text-slate-800"}`}
            >
              <span
                className={`block h-11 w-full rounded-lg ${selected ? "ring-2 ring-offset-2 ring-slate-900" : ""}`}
                style={{ backgroundColor: accent, backgroundImage: motifDataUrl(m.id, 24, 24, line), backgroundSize: "100% 100%" }}
              />
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
