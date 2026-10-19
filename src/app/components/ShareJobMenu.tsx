import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

const SITE = typeof window !== "undefined" ? window.location.origin : "https://projobai.com";

/** Liens de partage d'une offre : chaque lien porte sa source, comptée dans les statistiques RH. */
export default function ShareJobMenu({ jobId, title }: { jobId: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const link = (source: string) => `${SITE}/jobs/${jobId}?source=${source}`;
  const text = `Offre d'emploi : ${title}. Postulez sur ProJob AI :`;

  const channels = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${link("whatsapp")}`)}`, cls: "bg-[#25D366] text-white hover:bg-[#1EBE5A]" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link("facebook"))}`, cls: "bg-[#1877F2] text-white hover:bg-[#0F65D6]" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link("linkedin"))}`, cls: "bg-[#0A66C2] text-white hover:bg-[#08539E]" },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link("autre"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez ce lien :", link("autre"));
    }
  };

  return (
    <div className="mx-6 mb-5 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">Partager l&apos;offre</p>
      <p className="text-xs text-slate-500 mt-0.5 mb-3">Chaque lien indique d&apos;où viennent les candidats : vous le retrouvez dans les statistiques RH.</p>
      <div className="flex flex-wrap gap-2">
        {channels.map((c) => (
          <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" className={`px-3 py-2 rounded-lg text-sm font-bold ${c.cls}`}>
            {c.label}
          </a>
        ))}
        <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${link("email")}`)}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border border-slate-300 bg-white text-slate-700 hover:border-[#050FA0]">
          <Mail className="h-4 w-4" /> E-mail
        </a>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border border-slate-300 bg-white text-slate-700 hover:border-[#050FA0]">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Lien copié" : "Copier le lien"}
        </button>
      </div>
    </div>
  );
}
