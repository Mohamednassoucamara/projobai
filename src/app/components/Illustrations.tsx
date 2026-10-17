// Illustrations originales ProJob AI (SVG, légères, aux couleurs de la charte).
// Style : formes géométriques douces, personnages stylisés à la peau brune.

const BLUE = "#050FA0";
const BLUE_MID = "#1A27C2";
const BLUE_SOFT = "#E9EBFC";
const BLUE_SOFT2 = "#C9CEF7";
const RED = "#F92813";
const RED_SOFT = "#FEEDEA";
const INK = "#10132E";
const SKIN_A = "#8A5A3C";
const SKIN_B = "#6B4128";
const SKIN_C = "#A86F4C";
const HAIR = "#1E1410";
const WHITE = "#FFFFFF";

type Props = { className?: string; title?: string };

function Svg({ className, title, viewBox, children }: Props & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} xmlns="http://www.w3.org/2000/svg">
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

function Sparkle({ x, y, s = 1, color = RED }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -12 C1.5 -4 4 -1.5 12 0 C4 1.5 1.5 4 0 12 C-1.5 4 -4 1.5 -12 0 C-4 -1.5 -1.5 -4 0 -12Z"
      fill={color}
    />
  );
}

/** Accueil : une candidate et son téléphone, CV généré, score de compatibilité. */
export function HeroIllustration(p: Props) {
  return (
    <Svg viewBox="0 0 520 440" {...p}>
      <circle cx="270" cy="230" r="190" fill={BLUE_SOFT} />
      <circle cx="270" cy="230" r="140" fill="none" stroke={BLUE_SOFT2} strokeWidth="2" strokeDasharray="4 10" />

      {/* Carte CV */}
      <g transform="translate(250 70) rotate(4)">
        <rect width="200" height="250" rx="18" fill={WHITE} stroke={BLUE_SOFT2} strokeWidth="2" />
        <rect width="200" height="64" rx="18" fill={BLUE} />
        <rect y="46" width="200" height="18" fill={BLUE} />
        <circle cx="38" cy="32" r="18" fill={SKIN_C} stroke={WHITE} strokeWidth="3" />
        <rect x="66" y="22" width="96" height="10" rx="5" fill={WHITE} />
        <rect x="66" y="38" width="64" height="7" rx="3.5" fill={BLUE_SOFT2} />
        {[88, 110, 132].map((y, i) => (
          <g key={y}>
            <circle cx="24" cy={y + 4} r="4" fill={i === 0 ? RED : BLUE} />
            <rect x="36" y={y} width={i === 1 ? 120 : 140} height="8" rx="4" fill={BLUE_SOFT} />
          </g>
        ))}
        <rect x="20" y="160" width="70" height="8" rx="4" fill={INK} opacity="0.85" />
        {[180, 196, 212].map((y, i) => (
          <rect key={y} x="20" y={y} width={[160, 130, 148][i]} height="7" rx="3.5" fill={BLUE_SOFT} />
        ))}
      </g>

      {/* Badge compatibilité */}
      <g transform="translate(372 286)">
        <rect width="120" height="62" rx="16" fill={WHITE} stroke={BLUE_SOFT2} strokeWidth="2" />
        <circle cx="30" cy="31" r="17" fill="none" stroke={BLUE_SOFT} strokeWidth="6" />
        <circle cx="30" cy="31" r="17" fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round" strokeDasharray="93 107" transform="rotate(-90 30 31)" />
        <text x="58" y="30" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="17" fill={INK}>87 %</text>
        <text x="58" y="46" fontFamily="Figtree, sans-serif" fontSize="10" fill="#5A5F7D">compatible</text>
      </g>

      {/* Personnage */}
      <g transform="translate(80 120)">
        <path d="M60 300 C60 230 80 196 120 190 C160 196 180 230 180 300 Z" fill={BLUE} />
        <path d="M100 196 L120 232 L140 196 Z" fill={WHITE} />
        <path d="M120 232 L114 252 L120 290 L126 252 Z" fill={RED} />
        <rect x="108" y="166" width="24" height="30" rx="10" fill={SKIN_A} />
        <ellipse cx="120" cy="138" rx="36" ry="40" fill={SKIN_A} />
        <path d="M82 132 C80 96 104 84 124 86 C148 88 162 104 158 134 C150 116 132 110 118 112 C104 114 92 120 82 132Z" fill={HAIR} />
        <circle cx="106" cy="142" r="3.5" fill={INK} />
        <circle cx="134" cy="142" r="3.5" fill={INK} />
        <path d="M110 160 C116 166 124 166 130 160" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Bras et téléphone */}
        <path d="M168 224 C196 230 206 212 214 190" stroke={BLUE} strokeWidth="26" strokeLinecap="round" fill="none" />
        <circle cx="216" cy="182" r="13" fill={SKIN_A} />
        <rect x="204" y="132" width="40" height="66" rx="8" fill={INK} />
        <rect x="208" y="138" width="32" height="50" rx="4" fill={WHITE} />
        <rect x="212" y="144" width="20" height="5" rx="2.5" fill={BLUE} />
        <rect x="212" y="154" width="24" height="5" rx="2.5" fill={BLUE_SOFT2} />
        <rect x="212" y="164" width="16" height="5" rx="2.5" fill={RED} />
      </g>

      {/* Bulle IA */}
      <g transform="translate(36 60)">
        <rect width="150" height="58" rx="18" fill={WHITE} stroke={BLUE_SOFT2} strokeWidth="2" />
        <path d="M110 58 L122 74 L124 58Z" fill={WHITE} stroke={BLUE_SOFT2} strokeWidth="2" strokeLinejoin="round" />
        <rect x="108" y="54" width="18" height="6" fill={WHITE} />
        <Sparkle x={28} y={29} s={0.9} color={RED} />
        <rect x="48" y="20" width="84" height="8" rx="4" fill={BLUE} />
        <rect x="48" y="34" width="60" height="7" rx="3.5" fill={BLUE_SOFT2} />
      </g>
      <Sparkle x={470} y={60} s={1.1} color={RED} />
      <Sparkle x={210} y={40} s={0.6} color={BLUE_MID} />
      <Sparkle x={490} y={390} s={0.7} color={BLUE_MID} />
    </Svg>
  );
}

/** Entretien : recruteuse et candidat face à face. */
export function InterviewIllustration(p: Props) {
  return (
    <Svg viewBox="0 0 400 260" {...p}>
      <rect width="400" height="260" fill={BLUE_SOFT} />
      <circle cx="320" cy="50" r="70" fill={BLUE_SOFT2} opacity="0.6" />
      <rect x="40" y="186" width="320" height="14" rx="7" fill={INK} opacity="0.85" />
      <rect x="60" y="200" width="10" height="60" fill={INK} opacity="0.85" />
      <rect x="330" y="200" width="10" height="60" fill={INK} opacity="0.85" />
      {/* Recruteuse */}
      <g transform="translate(70 70)">
        <path d="M0 116 C0 76 18 58 46 56 C74 58 92 76 92 116Z" fill={RED} />
        <rect x="36" y="38" width="20" height="22" rx="8" fill={SKIN_B} />
        <ellipse cx="46" cy="26" rx="26" ry="28" fill={SKIN_B} />
        <path d="M18 30 C12 -2 76 -10 74 26 C72 50 82 60 78 70 C68 52 64 30 56 18 C44 26 30 22 18 30Z" fill={HAIR} />
        <circle cx="38" cy="30" r="2.6" fill={INK} /><circle cx="56" cy="30" r="2.6" fill={INK} />
        <path d="M40 42 C44 46 50 46 54 42" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      {/* Candidat */}
      <g transform="translate(238 70)">
        <path d="M0 116 C0 76 18 58 46 56 C74 58 92 76 92 116Z" fill={BLUE} />
        <path d="M34 58 L46 80 L58 58Z" fill={WHITE} />
        <rect x="36" y="38" width="20" height="22" rx="8" fill={SKIN_A} />
        <ellipse cx="46" cy="26" rx="26" ry="28" fill={SKIN_A} />
        <path d="M20 22 C20 0 72 -4 72 22 C62 12 34 12 20 22Z" fill={HAIR} />
        <circle cx="38" cy="30" r="2.6" fill={INK} /><circle cx="56" cy="30" r="2.6" fill={INK} />
        <path d="M40 42 C44 46 50 46 54 42" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      {/* Bulles */}
      <g transform="translate(150 22)">
        <rect width="92" height="40" rx="14" fill={WHITE} />
        <rect x="14" y="12" width="56" height="6" rx="3" fill={RED} />
        <rect x="14" y="23" width="40" height="5" rx="2.5" fill={BLUE_SOFT2} />
      </g>
      <g transform="translate(176 92)">
        <rect width="70" height="34" rx="12" fill={BLUE} />
        <rect x="12" y="11" width="44" height="5" rx="2.5" fill={WHITE} />
        <rect x="12" y="20" width="30" height="4" rx="2" fill={BLUE_SOFT2} />
      </g>
      <rect x="140" y="170" width="50" height="16" rx="3" fill={WHITE} />
      <rect x="146" y="175" width="30" height="3" rx="1.5" fill={BLUE_SOFT2} />
    </Svg>
  );
}

/** Retour personnalisé : note et points d'amélioration. */
export function FeedbackIllustration(p: Props) {
  return (
    <Svg viewBox="0 0 400 260" {...p}>
      <rect width="400" height="260" fill={RED_SOFT} />
      <circle cx="70" cy="210" r="80" fill="#FBD5CE" opacity="0.7" />
      <g transform="translate(110 34)">
        <rect width="180" height="192" rx="18" fill={WHITE} />
        <circle cx="90" cy="62" r="38" fill="none" stroke={RED_SOFT} strokeWidth="12" />
        <circle cx="90" cy="62" r="38" fill="none" stroke={RED} strokeWidth="12" strokeLinecap="round" strokeDasharray="191 239" transform="rotate(-90 90 62)" />
        <text x="90" y="70" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="24" fill={INK}>8/10</text>
        {[120, 144, 168].map((y, i) => (
          <g key={y}>
            <circle cx="30" cy={y} r="9" fill={i < 2 ? "#DDF3EA" : BLUE_SOFT} />
            {i < 2 ? (
              <path d={`M25 ${y} l4 4 l7 -8`} stroke="#0E8A5F" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d={`M30 ${y - 4} v5 M30 ${y + 4} v0.5`} stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" />
            )}
            <rect x="48" y={y - 4} width={[104, 90, 112][i]} height="8" rx="4" fill={i < 2 ? "#DDF3EA" : BLUE_SOFT} />
          </g>
        ))}
      </g>
      <Sparkle x={320} y={60} s={1.2} color={RED} />
      <Sparkle x={86} y={56} s={0.7} color={BLUE} />
    </Svg>
  );
}

/** Confiance : réussite et progression. */
export function SuccessIllustration(p: Props) {
  return (
    <Svg viewBox="0 0 400 260" {...p}>
      <rect width="400" height="260" fill={BLUE_SOFT} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={60 + i * 62} y={200 - (i + 1) * 34} width="40" height={(i + 1) * 34} rx="8" fill={i === 3 ? BLUE : BLUE_SOFT2} />
      ))}
      <path d="M70 150 L132 120 L194 104 L256 64" stroke={RED} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M244 60 L262 60 L258 78" stroke={RED} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(286 70)">
        <path d="M6 150 C6 110 22 92 48 90 C74 92 90 110 90 150Z" fill={BLUE} />
        <path d="M76 100 C92 80 96 60 92 40" stroke={BLUE} strokeWidth="18" strokeLinecap="round" fill="none" />
        <circle cx="92" cy="34" r="10" fill={SKIN_C} />
        <rect x="38" y="70" width="20" height="24" rx="8" fill={SKIN_C} />
        <ellipse cx="48" cy="58" rx="25" ry="27" fill={SKIN_C} />
        <path d="M24 54 C22 30 70 26 72 52 C64 42 36 40 24 54Z" fill={HAIR} />
        <path d="M40 66 C44 72 52 72 56 66" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="40" cy="58" r="2.4" fill={INK} /><circle cx="56" cy="58" r="2.4" fill={INK} />
      </g>
      <Sparkle x={330} y={40} s={1} color={RED} />
      <rect x="40" y="200" width="320" height="4" rx="2" fill={INK} opacity="0.2" />
    </Svg>
  );
}

/** Accueil des pages de connexion et d'inscription. */
export function WelcomeIllustration(p: Props) {
  return (
    <Svg viewBox="0 0 420 360" {...p}>
      <circle cx="210" cy="190" r="160" fill="rgba(255,255,255,0.08)" />
      <circle cx="210" cy="190" r="110" fill="rgba(255,255,255,0.08)" />
      {/* Bâtiment */}
      <g transform="translate(236 96)">
        <rect width="120" height="190" rx="10" fill="rgba(255,255,255,0.14)" />
        {[0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={18 + c * 32} y={20 + r * 32} width="20" height="18" rx="3" fill={r === 1 && c === 2 ? RED : "rgba(255,255,255,0.35)"} />
        )))}
      </g>
      {/* Personnage avec mallette */}
      <g transform="translate(86 110)">
        <path d="M10 240 C10 160 34 132 74 128 C114 132 138 160 138 240Z" fill={WHITE} />
        <path d="M56 130 L74 168 L92 130Z" fill={BLUE_SOFT2} />
        <path d="M74 168 L68 186 L74 220 L80 186Z" fill={RED} />
        <rect x="62" y="104" width="24" height="28" rx="10" fill={SKIN_A} />
        <ellipse cx="74" cy="80" rx="32" ry="36" fill={SKIN_A} />
        <path d="M42 76 C40 42 106 36 108 74 C96 60 58 58 42 76Z" fill={HAIR} />
        <circle cx="62" cy="84" r="3" fill={INK} /><circle cx="86" cy="84" r="3" fill={INK} />
        <path d="M64 98 C70 104 78 104 84 98" stroke={INK} strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <rect x="128" y="196" width="56" height="40" rx="6" fill={RED} />
        <path d="M144 196 v-8 a6 6 0 0 1 6 -6 h12 a6 6 0 0 1 6 6 v8" stroke={RED} strokeWidth="5" fill="none" />
      </g>
      <Sparkle x={70} y={80} s={1.2} color={RED} />
      <Sparkle x={380} y={60} s={0.8} color={WHITE} />
    </Svg>
  );
}
