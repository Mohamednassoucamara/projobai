// Orientation professionnelle hors IA : base de métiers porteurs en Guinée et calcul
// d'adéquation transparent. Sert de repli quand l'assistant IA n'est pas disponible.
// Contenu volontairement général : pas de salaires ni de noms d'établissements inventés.

export const NIVEAUX = ["Sans diplôme", "BEPC", "Baccalauréat", "BTS / DUT (Bac+2)", "Licence (Bac+3)", "Master (Bac+5)", "Doctorat"] as const;
export type Niveau = (typeof NIVEAUX)[number];

export const SITUATIONS = [
  "Je cherche mon premier emploi",
  "Je suis étudiant(e) et je choisis ma voie",
  "Je veux évoluer dans mon métier",
  "Je veux me reconvertir",
  "Je veux créer mon activité",
] as const;

export const INTERETS = [
  { id: "terrain", label: "Terrain et chantiers" },
  { id: "numerique", label: "Informatique et numérique" },
  { id: "chiffres", label: "Chiffres et gestion" },
  { id: "client", label: "Contact client et vente" },
  { id: "sante", label: "Santé et soin" },
  { id: "transmettre", label: "Enseigner et former" },
  { id: "nature", label: "Agriculture et environnement" },
  { id: "technique", label: "Mécanique et électricité" },
  { id: "creatif", label: "Communication et création" },
  { id: "social", label: "Aider les communautés" },
  { id: "organisation", label: "Logistique et organisation" },
  { id: "admin", label: "Droit et administration" },
] as const;
export type InteretId = (typeof INTERETS)[number]["id"];

export interface OrientationProfile {
  niveau: Niveau | "";
  domaine: string;
  situation: string;
  interets: InteretId[];
  competences: string;
  ville: string;
  mobilite: boolean;
  precisions: string;
}

export interface CareerSuggestion {
  title: string;
  match: number;
  why: string;
  sectors: string[];
  skillsToDevelop: string[];
  trainings: string[];
  firstSteps: string[];
}

export interface OrientationResult {
  summary: string;
  careers: CareerSuggestion[];
  advice: string[];
  source: "ai" | "local";
  createdAt: string;
}

interface Metier {
  title: string;
  interets: InteretId[];
  domaines: string[];
  niveauMin: number;
  sectors: string[];
  skills: string[];
  trainings: string[];
  firstStep: string;
  terrain?: boolean;
  pitch: string;
}

const METIERS: Metier[] = [
  { title: "Technicien en génie civil", interets: ["terrain", "technique"], domaines: ["génie civil", "btp", "construction", "bâtiment", "travaux publics", "topographie"], niveauMin: 3, sectors: ["BTP", "Mines", "Bureaux d'études", "Infrastructures publiques"], skills: ["Lecture de plans", "AutoCAD", "Métré", "Suivi de chantier"], trainings: ["BTS ou licence en génie civil", "Formation AutoCAD", "Initiation à la topographie"], firstStep: "Contacter trois entreprises de BTP pour un stage ou un poste d'assistant sur chantier.", terrain: true, pitch: "Les chantiers d'infrastructures et les projets miniers recrutent des techniciens capables de suivre les travaux sur le terrain." },
  { title: "Agent HSE (hygiène, sécurité, environnement)", interets: ["terrain", "nature", "organisation"], domaines: ["hse", "sécurité", "environnement", "qhse", "mines", "géologie", "chimie"], niveauMin: 3, sectors: ["Mines", "BTP", "Industrie", "Énergie"], skills: ["Analyse des risques", "Réglementation sécurité", "Animation de causeries sécurité", "Rédaction de rapports"], trainings: ["Licence ou BTS QHSE", "Certification en sécurité au travail", "Formation premiers secours"], firstStep: "Suivre une formation courte en sécurité au travail et préparer un CV axé sur la prévention des risques.", terrain: true, pitch: "Les sites miniers et industriels ont l'obligation de prévenir les accidents : les profils HSE y sont très demandés." },
  { title: "Technicien de maintenance industrielle", interets: ["technique", "terrain"], domaines: ["électromécanique", "mécanique", "maintenance", "électricité", "électrotechnique", "industrie"], niveauMin: 3, sectors: ["Mines", "Industrie", "Énergie", "Transport"], skills: ["Diagnostic de pannes", "Hydraulique", "Électricité industrielle", "Maintenance préventive"], trainings: ["BTS maintenance industrielle ou électromécanique", "Habilitation électrique", "Formation en hydraulique"], firstStep: "Lister les entreprises minières et industrielles de votre région et y déposer une candidature spontanée.", terrain: true, pitch: "Engins miniers, usines et centrales doivent tourner sans arrêt : la maintenance est un métier stable et recherché." },
  { title: "Électricien et installateur solaire", interets: ["technique", "terrain", "nature"], domaines: ["électricité", "énergie", "solaire", "électrotechnique"], niveauMin: 1, sectors: ["Énergie solaire", "BTP", "ONG", "Auto-entrepreneuriat"], skills: ["Installation électrique", "Dimensionnement solaire", "Sécurité électrique", "Relation client"], trainings: ["CAP ou BT en électricité", "Formation en installation photovoltaïque"], firstStep: "Se former à l'installation photovoltaïque et proposer ses services à des installateurs locaux.", terrain: true, pitch: "L'accès à l'électricité reste un besoin majeur : le solaire offre des emplois et des possibilités de créer son activité." },
  { title: "Technicien réseaux et télécoms", interets: ["numerique", "technique"], domaines: ["télécommunications", "télécom", "réseaux", "informatique", "électronique"], niveauMin: 3, sectors: ["Opérateurs télécoms", "Banques", "Mines", "Entreprises de services numériques"], skills: ["Réseaux IP", "Fibre optique", "Configuration d'équipements", "Support utilisateurs"], trainings: ["Licence en télécommunications ou réseaux", "Certification CCNA", "Formation fibre optique"], firstStep: "Préparer la certification CCNA en ligne et monter un petit réseau d'entraînement.", pitch: "Le développement du mobile et de la fibre crée des besoins en techniciens réseaux dans tout le pays." },
  { title: "Développeur web et mobile", interets: ["numerique", "creatif"], domaines: ["informatique", "développement", "programmation", "génie logiciel", "mathématiques"], niveauMin: 2, sectors: ["Entreprises de services numériques", "Banques et Mobile Money", "Startups", "Freelance"], skills: ["JavaScript", "Développement mobile", "Bases de données", "Git"], trainings: ["Licence en informatique", "Bootcamp ou formation en ligne en développement web", "Projets personnels publiés sur GitHub"], firstStep: "Réaliser un premier projet concret (site ou application) et le publier en ligne comme portfolio.", pitch: "Banques, Mobile Money et startups numérisent leurs services : un portfolio solide compte autant que le diplôme." },
  { title: "Technicien support informatique", interets: ["numerique", "client"], domaines: ["informatique", "maintenance informatique", "réseaux", "bureautique"], niveauMin: 2, sectors: ["Toutes entreprises", "Administrations", "ONG", "Cybercafés et centres de services"], skills: ["Dépannage matériel et logiciel", "Windows et Office", "Réseau local", "Écoute utilisateur"], trainings: ["BTS informatique", "Certification CompTIA A+ ou équivalent"], firstStep: "Proposer un stage de support informatique dans une entreprise ou une ONG de votre ville.", pitch: "Chaque entreprise a besoin de quelqu'un pour faire fonctionner ses ordinateurs : c'est une bonne porte d'entrée dans le numérique." },
  { title: "Comptable", interets: ["chiffres", "organisation"], domaines: ["comptabilité", "finance", "gestion", "économie", "audit"], niveauMin: 3, sectors: ["Cabinets comptables", "Entreprises", "ONG", "Banques"], skills: ["Comptabilité OHADA", "Excel", "Fiscalité", "Rigueur"], trainings: ["BTS ou licence en comptabilité", "Formation à un logiciel comptable", "Excel avancé"], firstStep: "Maîtriser un logiciel comptable courant et chercher un stage en cabinet.", pitch: "Toutes les structures, des PME aux ONG, ont besoin de tenir une comptabilité conforme au droit OHADA." },
  { title: "Chargé de clientèle (banque, assurance, Mobile Money)", interets: ["client", "chiffres"], domaines: ["banque", "finance", "commerce", "gestion", "marketing", "économie"], niveauMin: 3, sectors: ["Banques", "Microfinance", "Assurances", "Opérateurs de Mobile Money"], skills: ["Relation client", "Produits financiers", "Vente", "Conformité"], trainings: ["Licence en banque-finance ou gestion", "Formation en techniques de vente"], firstStep: "Postuler aux stages et programmes jeunes diplômés des banques et institutions de microfinance.", pitch: "L'inclusion financière progresse vite : banques, microfinance et Mobile Money recrutent des profils commerciaux." },
  { title: "Commercial terrain", interets: ["client", "terrain"], domaines: ["commerce", "vente", "marketing", "gestion"], niveauMin: 2, sectors: ["Distribution", "Télécoms", "Agroalimentaire", "Pharmacie"], skills: ["Prospection", "Négociation", "Suivi des ventes", "Permis de conduire"], trainings: ["BTS commerce", "Formation en techniques de vente", "Permis de conduire"], firstStep: "Préparer un argumentaire de 1 minute sur vous et contacter les distributeurs de votre ville.", terrain: true, pitch: "Les entreprises de distribution cherchent des vendeurs capables de développer leur réseau, en ville comme en région." },
  { title: "Logisticien / gestionnaire de stock", interets: ["organisation", "chiffres"], domaines: ["logistique", "transport", "gestion", "supply chain", "commerce"], niveauMin: 3, sectors: ["Transport", "Ports", "Mines", "ONG", "Distribution"], skills: ["Gestion des stocks", "Excel", "Planification", "Suivi des expéditions"], trainings: ["BTS ou licence en logistique et transport", "Excel avancé"], firstStep: "Chercher un stage dans une société de transport ou un entrepôt pour découvrir les flux de marchandises.", pitch: "Avec l'activité portuaire et minière, la logistique offre des postes variés entre bureau et terrain." },
  { title: "Chargé de suivi-évaluation (ONG)", interets: ["social", "chiffres", "organisation"], domaines: ["sociologie", "économie", "statistique", "développement", "santé publique", "géographie"], niveauMin: 4, sectors: ["ONG", "Agences internationales", "Projets de développement"], skills: ["Collecte de données", "Excel et outils de sondage mobile", "Rédaction de rapports", "Anglais"], trainings: ["Licence ou master en développement, statistique ou sciences sociales", "Formation au suivi-évaluation", "Anglais professionnel"], firstStep: "Se former à un outil de collecte mobile et s'inscrire sur les plateformes d'offres des ONG.", pitch: "Les projets de développement doivent prouver leurs résultats : ils recrutent des profils rigoureux qui savent mesurer." },
  { title: "Assistant de programme / animateur communautaire", interets: ["social", "transmettre"], domaines: ["sociologie", "développement", "santé", "éducation", "droit"], niveauMin: 3, sectors: ["ONG", "Associations", "Projets communautaires"], skills: ["Animation de groupes", "Langues nationales", "Rédaction", "Organisation d'activités"], trainings: ["Licence en sciences sociales ou développement", "Formation en animation communautaire"], firstStep: "S'engager comme bénévole dans une association pour acquérir une première expérience de terrain.", terrain: true, pitch: "Les ONG ont besoin de personnes qui parlent les langues locales et savent mobiliser les communautés." },
  { title: "Enseignant ou formateur", interets: ["transmettre", "social"], domaines: ["éducation", "lettres", "mathématiques", "sciences", "langues", "physique", "chimie"], niveauMin: 3, sectors: ["Écoles privées", "Centres de formation", "Cours de soutien", "Formation en ligne"], skills: ["Pédagogie", "Maîtrise de la matière", "Gestion de classe", "Préparation de supports"], trainings: ["Licence dans la matière enseignée", "Formation en pédagogie"], firstStep: "Proposer des cours de soutien dans votre quartier pour tester votre aisance pédagogique.", pitch: "La demande en enseignement privé et en formation professionnelle reste forte, notamment en sciences et en langues." },
  { title: "Infirmier ou agent de santé", interets: ["sante", "social"], domaines: ["santé", "infirmier", "médecine", "biologie", "sage-femme"], niveauMin: 2, sectors: ["Hôpitaux et cliniques", "ONG de santé", "Mines (infirmeries de site)", "Pharmacies"], skills: ["Soins infirmiers", "Hygiène", "Premiers secours", "Écoute des patients"], trainings: ["Diplôme d'État d'infirmier ou d'agent technique de santé", "Formation premiers secours"], firstStep: "Se renseigner sur les écoles de santé agréées et les conditions d'admission.", pitch: "Les besoins en soins sont importants partout dans le pays, y compris dans les infirmeries des sites miniers." },
  { title: "Technicien agricole / agronome", interets: ["nature", "terrain"], domaines: ["agronomie", "agriculture", "élevage", "environnement", "biologie", "eaux et forêts"], niveauMin: 2, sectors: ["Agro-industrie", "ONG", "Projets agricoles", "Création d'exploitation"], skills: ["Techniques culturales", "Conseil aux producteurs", "Gestion d'exploitation", "Langues nationales"], trainings: ["BTS ou licence en agronomie", "Formation en entrepreneuriat agricole"], firstStep: "Contacter des coopératives ou projets agricoles de votre région pour un stage terrain.", terrain: true, pitch: "L'agriculture emploie une grande partie de la population : les projets de modernisation cherchent des techniciens." },
  { title: "Chargé de communication / community manager", interets: ["creatif", "numerique", "client"], domaines: ["communication", "journalisme", "marketing", "lettres", "multimédia"], niveauMin: 3, sectors: ["Agences", "Entreprises", "ONG", "Médias", "Freelance"], skills: ["Réseaux sociaux", "Rédaction", "Création visuelle (Canva)", "Photo et vidéo"], trainings: ["Licence en communication ou marketing", "Formation en marketing digital"], firstStep: "Gérer bénévolement la page d'une association pour constituer un portfolio de publications.", pitch: "Entreprises et ONG investissent les réseaux sociaux et cherchent des profils capables de produire du contenu." },
  { title: "Assistant RH / administratif", interets: ["admin", "organisation", "client"], domaines: ["gestion", "ressources humaines", "droit", "administration", "secrétariat"], niveauMin: 3, sectors: ["Entreprises", "Administrations", "ONG", "Cabinets de recrutement"], skills: ["Bureautique", "Droit du travail", "Gestion administrative du personnel", "Discrétion"], trainings: ["Licence en gestion des ressources humaines", "Formation au Code du travail guinéen", "Excel"], firstStep: "Chercher un stage en service RH ou en cabinet de recrutement.", pitch: "Toutes les structures ont besoin de gérer contrats, paie et recrutements selon le droit du travail." },
  { title: "Juriste d'entreprise", interets: ["admin"], domaines: ["droit", "sciences juridiques", "sciences politiques"], niveauMin: 4, sectors: ["Entreprises", "Mines", "Banques", "Cabinets"], skills: ["Droit OHADA", "Rédaction de contrats", "Veille juridique", "Négociation"], trainings: ["Licence ou master en droit des affaires", "Spécialisation droit OHADA ou droit minier"], firstStep: "Se spécialiser (droit des affaires, droit minier) et chercher un stage en cabinet ou en direction juridique.", pitch: "Les contrats miniers et commerciaux demandent des juristes formés au droit OHADA." },
  { title: "Créateur d'activité (entrepreneur)", interets: ["client", "organisation", "creatif"], domaines: ["gestion", "commerce", "entrepreneuriat", "marketing"], niveauMin: 0, sectors: ["Commerce", "Services", "Agro-transformation", "Numérique"], skills: ["Étude de marché", "Gestion financière", "Vente", "Mobile Money"], trainings: ["Formation en création d'entreprise", "Programmes d'incubation et concours d'entrepreneuriat"], firstStep: "Tester votre idée auprès de 10 clients potentiels avant d'investir.", pitch: "Créer son activité est une vraie voie d'insertion, surtout avec l'appui des incubateurs et des concours pour jeunes." },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function localOrientation(p: OrientationProfile): OrientationResult {
  const niveauIdx = Math.max(0, NIVEAUX.indexOf(p.niveau as Niveau));
  const dom = norm(`${p.domaine} ${p.competences} ${p.precisions}`);
  const myInterests = new Set(p.interets);

  const scored = METIERS.map((m) => {
    const interestHits = m.interets.filter((i) => myInterests.has(i)).length;
    const domainHits = m.domaines.filter((d) => dom.includes(norm(d))).length;
    const skillHits = m.skills.filter((s) => dom.includes(norm(s).split(" ")[0])).length;
    let score = interestHits * 22 + Math.min(2, domainHits) * 20 + Math.min(2, skillHits) * 6;
    const levelGap = m.niveauMin - niveauIdx;
    if (levelGap > 0) score -= levelGap * 12;
    if (m.terrain && !p.mobilite) score -= 6;
    if (p.situation.includes("créer") && m.title.startsWith("Créateur")) score += 25;
    return { m, score, levelGap };
  }).sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3);
  const max = Math.max(1, top[0].score);
  const careers: CareerSuggestion[] = top.map(({ m, score, levelGap }) => {
    const reasons: string[] = [];
    const hits = m.interets.filter((i) => myInterests.has(i)).map((i) => INTERETS.find((x) => x.id === i)?.label.toLowerCase());
    if (hits.length) reasons.push(`Il correspond à votre intérêt pour : ${hits.join(", ")}.`);
    if (m.domaines.some((d) => dom.includes(norm(d)))) reasons.push("Il prolonge directement votre domaine de formation.");
    reasons.push(m.pitch);
    if (levelGap > 0) reasons.push("Il demande en général un niveau d'études plus élevé : prévoyez une formation complémentaire.");
    return {
      title: m.title,
      match: Math.max(35, Math.min(95, Math.round((score / max) * 88))),
      why: reasons.join(" "),
      sectors: m.sectors,
      skillsToDevelop: m.skills,
      trainings: m.trainings,
      firstSteps: [
        `Ce mois-ci : ${m.firstStep}`,
        `D'ici 3 mois : renforcer une compétence clé (${m.skills[0]}) et l'ajouter à votre CV.`,
        `D'ici 6 mois : obtenir une première expérience (stage, bénévolat ou mission) et demander une recommandation.`,
      ],
    };
  });

  const advice = [
    "Adaptez votre CV à chaque piste : titre du poste, profil et compétences doivent parler au recruteur visé.",
    p.ville ? `Repérez les entreprises qui recrutent à ${p.ville} et dans les villes proches, et présentez-vous avec un CV imprimé.` : "Repérez les entreprises qui recrutent dans votre ville et présentez-vous avec un CV imprimé.",
    "Activez votre réseau : anciens enseignants, camarades de promotion, associations. Une grande partie des recrutements passe par recommandation.",
    "Entraînez-vous à l'entretien sur ProJob AI avant chaque rendez-vous.",
  ];

  return {
    summary: `D'après vos réponses, voici trois pistes réalistes sur le marché guinéen. Elles s'appuient sur vos centres d'intérêt${p.domaine ? ` et votre formation en ${p.domaine}` : ""}.`,
    careers,
    advice,
    source: "local",
    createdAt: new Date().toISOString(),
  };
}

export function normalizeOrientation(raw: unknown): OrientationResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<OrientationResult>;
  if (!Array.isArray(r.careers) || r.careers.length === 0) return null;
  const arr = (v: unknown, n = 6) => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, n) : []);
  return {
    summary: String(r.summary || ""),
    careers: r.careers.slice(0, 3).map((c) => ({
      title: String(c?.title || "Métier"),
      match: Math.max(0, Math.min(100, Math.round(Number(c?.match) || 60))),
      why: String(c?.why || ""),
      sectors: arr(c?.sectors),
      skillsToDevelop: arr(c?.skillsToDevelop),
      trainings: arr(c?.trainings),
      firstSteps: arr(c?.firstSteps, 4),
    })),
    advice: arr(r.advice, 5),
    source: r.source === "ai" ? "ai" : "local",
    createdAt: String(r.createdAt || new Date().toISOString()),
  };
}
