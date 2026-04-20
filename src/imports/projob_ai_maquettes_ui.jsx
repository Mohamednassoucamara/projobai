export default function ProJobAIMockups() {
  const screens = [
    {
      title: "1. Écran d’accueil",
      subtitle: "Entrée simple et rassurante",
      content: [
        "Logo ProJob AI en haut",
        "Titre : L’IA qui vous prépare à l’emploi",
        "Sous-titre : Créez votre CV, générez votre lettre de motivation et entraînez-vous aux entretiens",
        "Bouton principal : Commencer",
        "Bouton secondaire : Se connecter",
        "Bloc 1 : Créer mon CV avec l’IA",
        "Bloc 2 : Préparer mon entretien",
        "Bloc 3 : Trouver un emploi",
        "Lien : Espace entreprise"
      ]
    },
    {
      title: "2. Choix du profil",
      subtitle: "Séparer candidat et entreprise dès le début",
      content: [
        "Carte 1 : Je suis candidat",
        "Texte : Je veux créer mon CV, me préparer et postuler",
        "Carte 2 : Je suis une entreprise",
        "Texte : Je veux publier une offre et recruter",
        "Bouton continuer"
      ]
    },
    {
      title: "3. Inscription / Connexion candidat",
      subtitle: "Simple, rapide et locale",
      content: [
        "Champs : Nom complet, téléphone, email, mot de passe",
        "Option : Continuer avec Google plus tard",
        "Lien : J’ai déjà un compte",
        "Message rassurant : Vos données sont sécurisées"
      ]
    },
    {
      title: "4. Tableau de bord candidat",
      subtitle: "Vue centrale après connexion",
      content: [
        "Salutation personnalisée : Bonjour Mohamed",
        "Carte principale : Compléter mon profil",
        "Menu rapide : Mon CV / Lettre de motivation / Entretien / Offres d’emploi",
        "Section progression : Profil complété à 60%",
        "Section recommandations : 3 postes recommandés"
      ]
    },
    {
      title: "5. Assistant conversationnel CV",
      subtitle: "Le cœur du produit",
      content: [
        "Interface type chat",
        "Message IA : Bonjour, je vais t’aider à créer un CV professionnel",
        "Questions successives : nom, niveau d’étude, expériences, compétences, langues, objectif professionnel",
        "Champ texte + bouton Envoyer",
        "Option : Répondre par audio plus tard",
        "Barre de progression en haut"
      ]
    },
    {
      title: "6. Aperçu du CV généré",
      subtitle: "Résultat clair et modifiable",
      content: [
        "Aperçu CV à droite ou en dessous sur mobile",
        "Sections : Profil / Expériences / Formations / Compétences / Langues",
        "Boutons : Modifier / Télécharger PDF / Choisir un modèle",
        "Encart IA : Conseils pour améliorer votre CV"
      ]
    },
    {
      title: "7. Génération de lettre de motivation",
      subtitle: "Assistant guidé",
      content: [
        "Champs ou chat : Nom entreprise, poste visé, secteur, expérience liée",
        "Bouton : Générer ma lettre",
        "Résultat avec mise en page propre",
        "Boutons : Copier / Modifier / Télécharger"
      ]
    },
    {
      title: "8. Préparation entretien",
      subtitle: "Simulation intelligente",
      content: [
        "Choix du type d’entretien : débutant / administratif / commercial / technique",
        "IA pose une question : Présentez-vous",
        "Zone de réponse utilisateur",
        "Retour IA : correction, note, meilleure réponse proposée",
        "Bouton : Question suivante"
      ]
    },
    {
      title: "9. Liste des offres d’emploi",
      subtitle: "Consultation simple",
      content: [
        "Barre de recherche",
        "Filtres : secteur, ville, niveau d’étude, type de contrat",
        "Cartes offres : titre, entreprise, lieu, date, niveau requis",
        "Bouton : Voir détails"
      ]
    },
    {
      title: "10. Détail d’une offre",
      subtitle: "Décision rapide de postuler",
      content: [
        "Titre du poste",
        "Entreprise",
        "Description du poste",
        "Compétences requises",
        "Date limite",
        "Bouton : Postuler maintenant",
        "Bouton : Adapter mon CV avec l’IA"
      ]
    },
    {
      title: "11. Tableau de bord entreprise",
      subtitle: "Simple et orienté recrutement",
      content: [
        "Bloc : Publier une offre",
        "Bloc : Candidatures reçues",
        "Bloc : Rechercher des profils",
        "Statistiques : offres actives, candidatures, profils favoris"
      ]
    },
    {
      title: "12. Publication d’offre",
      subtitle: "Formulaire court mais précis",
      content: [
        "Champs : Intitulé du poste, description, localisation, niveau d’étude, expérience, type de contrat",
        "Bouton : Publier l’offre",
        "Option future : Générer la description avec l’IA"
      ]
    },
    {
      title: "13. Recherche de profils",
      subtitle: "Matching entreprise-candidat",
      content: [
        "Recherche par poste, compétence, secteur",
        "Filtres : expérience, ville, niveau d’étude",
        "Cartes candidats : nom, titre, compétences, score de compatibilité",
        "Bouton : Voir profil"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm border">
          <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-700">
            ProJob AI
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight text-slate-900">
            Maquettes UI de l’application
          </h1>
          <p className="mt-3 max-w-3xl text-base md:text-lg text-slate-600">
            Structure recommandée pour la version MVP de ProJob AI, avec une expérience simple, moderne et adaptée au marché guinéen.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {screens.map((screen, index) => (
            <div key={index} className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Écran {index + 1}
                </span>
                <span className="text-xs text-slate-400">MVP</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{screen.title}</h2>
              <p className="mt-1 text-sm text-blue-700 font-medium">{screen.subtitle}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {screen.content.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-400"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm border">
          <h2 className="text-2xl font-bold text-slate-900">Ordre recommandé de développement</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Accueil + inscription",
              "Dashboard candidat",
              "Assistant CV conversationnel",
              "Aperçu et export CV",
              "Lettre de motivation",
              "Simulation entretien",
              "Liste et détail offres",
              "Espace entreprise"
            ].map((step, i) => (
              <div key={i} className="rounded-2xl bg-slate-50 p-4 border text-sm font-medium text-slate-700">
                {i + 1}. {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
