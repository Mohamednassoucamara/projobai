import type { CSSProperties } from "react";
import { useCVData } from "../contexts/CVDataContext";
import { safeAccent, tint, rgbToHex, initials } from "../../lib/cvTheme";
import { motifDataUrl } from "../../lib/motifs";
import type { LetterContent } from "../../lib/letterPdf";

/** 1 mm de la feuille A4 = largeur du conteneur / 210 (même géométrie que le PDF). */
const mm = (n: number) => `calc(${n} * 100cqw / 210)`;
const pt = (n: number) => mm(n * 0.3528);

interface Props {
  content: LetterContent;
  editing?: boolean;
  onChange?: (patch: Partial<LetterContent>) => void;
}

export default function LetterSheet({ content, editing = false, onChange }: Props) {
  const { cvData } = useCVData();
  const t = cvData.letterTemplate;
  const accentRgb = safeAccent(cvData.theme);
  const accent = rgbToHex(accentRgb);
  const ink = "#1B2333";
  const muted = "#606A7A";
  const contact = [cvData.phone, cvData.email, cvData.location].filter(Boolean);
  const ini = initials(cvData.fullName);

  const Avatar = ({ d, onDark }: { d: number; onDark: boolean }) =>
    cvData.photo ? (
      <img src={cvData.photo} alt="" style={{ width: mm(d), height: mm(d), borderRadius: "50%", objectFit: "cover", border: `${mm(1)} solid ${onDark ? "#fff" : accent}`, flexShrink: 0 }} />
    ) : ini ? (
      <div style={{ width: mm(d), height: mm(d), borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, background: rgbToHex(tint(accentRgb, onDark ? 0.18 : 0.86)), color: onDark ? "#fff" : accent, fontWeight: 700, fontSize: pt(d * 1.55) }}>{ini}</div>
    ) : null;

  const motif = (w: number, h: number, k = 0.16) => motifDataUrl(cvData.motif, w, h, rgbToHex(tint(accentRgb, k)));

  let header: JSX.Element;
  let pad: CSSProperties;
  if (t === "moderne") {
    header = (
      <div style={{ height: mm(46), backgroundColor: accent, backgroundImage: motif(210, 46), backgroundSize: "100% 100%", display: "flex", alignItems: "center", gap: mm(8), padding: `0 ${mm(22)}`, color: "#fff" }}>
        <Avatar d={28} onDark />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: pt(21), fontWeight: 700, lineHeight: 1.15 }}>{cvData.fullName || "Votre nom"}</div>
          {cvData.jobTitle && <div style={{ fontSize: pt(11.5), color: rgbToHex(tint(accentRgb, 0.8)), marginTop: mm(1.5) }}>{cvData.jobTitle}</div>}
          <div style={{ fontSize: pt(8.6), marginTop: mm(3), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.join("   |   ")}</div>
        </div>
      </div>
    );
    pad = { padding: `${mm(16)} ${mm(22)} ${mm(20)}` };
  } else if (t === "classique") {
    header = (
      <>
        <div style={{ height: mm(7), backgroundColor: accent, backgroundImage: motif(210, 7, 0.2), backgroundSize: "100% 100%" }} />
        <div style={{ padding: `${mm(11)} ${mm(22)} 0`, display: "flex", justifyContent: "space-between", gap: mm(6) }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: pt(22), fontWeight: 700, color: accent, lineHeight: 1.15 }}>{cvData.fullName || "Votre nom"}</div>
            {cvData.jobTitle && <div style={{ fontSize: pt(11.5), color: muted, marginTop: mm(1.5) }}>{cvData.jobTitle}</div>}
            <div style={{ marginTop: mm(4) }}>{contact.map((c) => <div key={c} style={{ fontSize: pt(8.8), color: ink, lineHeight: 1.45 }}>{c}</div>)}</div>
          </div>
          {cvData.photo && <Avatar d={26} onDark={false} />}
        </div>
        <div style={{ margin: `${mm(4)} ${mm(22)} 0`, height: mm(0.5), background: rgbToHex(tint(accentRgb, 0.6)) }} />
      </>
    );
    pad = { padding: `${mm(12)} ${mm(22)} ${mm(20)}` };
  } else {
    header = (
      <div style={{ padding: `${mm(16)} ${mm(22)} 0 ${mm(31)}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: mm(7) }}>
          <Avatar d={26} onDark={false} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: pt(21), fontWeight: 700, color: ink, lineHeight: 1.15 }}>{cvData.fullName || "Votre nom"}</div>
            {cvData.jobTitle && <div style={{ fontSize: pt(11.5), color: accent, marginTop: mm(1.5) }}>{cvData.jobTitle}</div>}
            <div style={{ fontSize: pt(8.6), color: muted, marginTop: mm(1.5) }}>{contact.join("  ·  ")}</div>
          </div>
        </div>
        <div style={{ width: mm(18), height: mm(0.6), background: accent, marginTop: mm(6) }} />
      </div>
    );
    pad = { padding: `${mm(12)} ${mm(22)} ${mm(20)} ${mm(31)}` };
  }

  const field: CSSProperties = { font: "inherit", color: "inherit", width: "100%", border: `1px dashed ${rgbToHex(tint(accentRgb, 0.5))}`, borderRadius: mm(1), background: rgbToHex(tint(accentRgb, 0.95)), padding: mm(1.5) };
  const paragraphs = content.body.split(/\n\s*\n|\n/).filter((p) => p.trim());

  return (
    <div style={{ containerType: "inline-size" }} className="w-full">
      <div
        className="bg-white shadow-2xl shadow-slate-300/60 rounded-sm overflow-hidden relative"
        style={{ minHeight: mm(297), fontFamily: "Helvetica, Arial, sans-serif", color: ink, lineHeight: 1.5 }}
      >
        {t === "elegant" && (
          <div aria-hidden="true" style={{ position: "absolute", inset: `0 auto 0 0`, width: mm(15), backgroundColor: accent, backgroundImage: motif(15, 297), backgroundSize: "100% 100%" }} />
        )}
        {header}
        <div style={{ ...pad, fontSize: pt(10.6) }}>
          <div style={{ textAlign: "right", fontSize: pt(10) }}>
            {(content.place || "Conakry")}, le {content.date}
          </div>
          <div style={{ textAlign: "right", marginTop: mm(5), fontSize: pt(10.2) }}>
            {editing ? (
              <>
                <input aria-label="Destinataire" value={content.company} onChange={(e) => onChange?.({ company: e.target.value })} style={{ ...field, textAlign: "right", fontWeight: 700 }} />
                <input aria-label="À l'attention de" value={content.attention} onChange={(e) => onChange?.({ attention: e.target.value })} style={{ ...field, textAlign: "right", marginTop: mm(1) }} />
              </>
            ) : (
              <>
                {content.company && <div style={{ fontWeight: 700 }}>{content.company}</div>}
                {content.attention && <div>{content.attention}</div>}
              </>
            )}
          </div>
          <div style={{ marginTop: mm(9), fontWeight: 700, fontSize: pt(10.5), display: "flex", gap: mm(1.5), alignItems: "baseline" }}>
            <span style={{ color: accent, whiteSpace: "nowrap" }}>Objet :</span>
            {editing ? (
              <input aria-label="Objet" value={content.objet} onChange={(e) => onChange?.({ objet: e.target.value })} style={field} />
            ) : (
              <span>{content.objet}</span>
            )}
          </div>
          <div style={{ marginTop: mm(7) }}>
            {editing ? (
              <textarea
                aria-label="Texte de la lettre"
                value={content.body}
                onChange={(e) => onChange?.({ body: e.target.value })}
                rows={22}
                style={{ ...field, resize: "vertical", lineHeight: 1.5 }}
              />
            ) : (
              paragraphs.map((p, i) => (
                <p key={i} style={{ textAlign: p.length < 60 ? "left" : "justify", marginBottom: mm(3.4), hyphens: "auto" }}>{p}</p>
              ))
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: mm(12) }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ width: mm(30), height: mm(0.5), background: accent, marginLeft: "auto", marginBottom: mm(5) }} />
              <div style={{ fontWeight: 700, fontSize: pt(11) }}>{cvData.fullName || "Votre nom"}</div>
              {cvData.jobTitle && <div style={{ fontSize: pt(9.2), color: muted }}>{cvData.jobTitle}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
