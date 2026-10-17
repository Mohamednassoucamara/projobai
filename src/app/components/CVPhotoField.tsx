import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { useCVData } from "../contexts/CVDataContext";
import { preparePhoto, PhotoError } from "../../lib/cvPhoto";

/** Ajout, recadrage et suppression de la photo du CV. */
export default function CVPhotoField({ compact = false }: { compact?: boolean }) {
  const { cvData, updateCVData } = useCVData();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetY, setOffsetY] = useState(-0.15);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const seq = useRef(0);

  const process = async (file: File, z = zoom, o = offsetY) => {
    const id = ++seq.current;
    setBusy(true);
    setError(null);
    try {
      const photo = await preparePhoto(file, z, o);
      if (id === seq.current) updateCVData({ photo }); // seul le dernier recadrage compte
    } catch (e) {
      if (id === seq.current) setError(e instanceof PhotoError ? e.message : "La photo n'a pas pu être ajoutée. Réessayez avec une autre image.");
    } finally {
      if (id === seq.current) setBusy(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    fileRef.current = file;
    setZoom(1);
    setOffsetY(-0.15);
    void process(file, 1, -0.15);
  };

  const reframe = (z: number, o: number) => {
    setZoom(z);
    setOffsetY(o);
    if (fileRef.current) void process(fileRef.current, z, o);
  };

  const remove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      window.setTimeout(() => setConfirmRemove(false), 3500);
      return;
    }
    setConfirmRemove(false);
    fileRef.current = null;
    updateCVData({ photo: "" });
  };

  return (
    <div className={compact ? "" : "rounded-2xl border-2 border-slate-100 p-4 sm:p-5"}>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 grid place-items-center">
          {cvData.photo ? (
            <img src={cvData.photo} alt="Votre photo de CV" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-9 w-9 text-slate-400" aria-hidden="true" />
          )}
          {busy && (
            <div className="absolute inset-0 bg-white/70 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#003087]" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800">Photo (facultative)</p>
          <p className="text-sm text-slate-500">Portrait de face, fond clair, tenue professionnelle.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#003087] text-white text-sm font-bold hover:bg-[#002366] disabled:opacity-60"
            >
              <Camera className="h-4 w-4" /> {cvData.photo ? "Changer la photo" : "Ajouter une photo"}
            </button>
            {cvData.photo && (
              <button
                type="button"
                onClick={remove}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border ${confirmRemove ? "bg-red-600 border-red-600 text-white" : "border-red-200 text-red-700 hover:bg-red-50"}`}
              >
                <Trash2 className="h-4 w-4" /> {confirmRemove ? "Confirmer" : "Retirer"}
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="sr-only" aria-label="Choisir une photo" />
        </div>
      </div>

      {cvData.photo && fileRef.current && (
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <label className="text-sm text-slate-700">
            <span className="block font-medium mb-1">Zoom</span>
            <input type="range" min={1} max={2.2} step={0.1} value={zoom} onChange={(e) => reframe(Number(e.target.value), offsetY)} className="w-full accent-[#003087]" />
          </label>
          <label className="text-sm text-slate-700">
            <span className="block font-medium mb-1">Position verticale</span>
            <input type="range" min={-1} max={1} step={0.1} value={offsetY} onChange={(e) => reframe(zoom, Number(e.target.value))} className="w-full accent-[#003087]" />
          </label>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
