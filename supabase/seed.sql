-- Données de test pour ProJob AI
-- ATTENTION : À utiliser uniquement en développement
-- Ne jamais exécuter en production

-- =====================================================
-- DONNÉES DE TEST - UTILISATEURS
-- =====================================================

-- Note: Les IDs doivent correspondre aux utilisateurs créés via Supabase Auth
-- Créez d'abord les comptes via l'interface Auth avant d'exécuter ce script

-- Exemple de profils candidats (remplacez les UUIDs par vos IDs réels)
/*
INSERT INTO profiles (id, user_type, full_name, email, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'candidate', 'Mohamed Diallo', 'mohamed.diallo@example.com', '+224622111111'),
  ('00000000-0000-0000-0000-000000000002', 'candidate', 'Fatoumata Camara', 'fatoumata.camara@example.com', '+224622222222'),
  ('00000000-0000-0000-0000-000000000003', 'candidate', 'Mamadou Bah', 'mamadou.bah@example.com', '+224622333333');

INSERT INTO candidate_profiles (id, job_title, location, profile_summary, profile_completion) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Développeur Full Stack', 'Conakry, Guinée', 'Développeur passionné avec 3 ans d''expérience en React et Node.js. Spécialisé dans la création d''applications web modernes et performantes.', 80),
  ('00000000-0000-0000-0000-000000000002', 'Chef de Projet Digital', 'Conakry, Guinée', 'Chef de projet expérimentée avec 5 ans d''expérience dans la gestion de projets digitaux et la coordination d''équipes.', 90),
  ('00000000-0000-0000-0000-000000000003', 'Comptable', 'Conakry, Guinée', 'Comptable certifié avec expertise en gestion financière et audit. Maîtrise des logiciels de comptabilité modernes.', 75);

-- Expériences professionnelles
INSERT INTO experiences (candidate_id, title, company, location, start_date, end_date, is_current, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Développeur Full Stack', 'Tech Innovations GN', 'Conakry', '2021-01-01', NULL, true, ARRAY[
    'Développement d''applications web avec React et TypeScript',
    'Création d''APIs REST avec Node.js et Express',
    'Optimisation des performances et amélioration de l''expérience utilisateur',
    'Collaboration avec une équipe agile de 8 développeurs'
  ]),
  ('00000000-0000-0000-0000-000000000001', 'Développeur Junior', 'StartUp Digital', 'Conakry', '2019-06-01', '2020-12-31', false, ARRAY[
    'Développement de fonctionnalités frontend avec React',
    'Maintenance et correction de bugs',
    'Participation aux code reviews'
  ]),
  ('00000000-0000-0000-0000-000000000002', 'Chef de Projet Digital', 'Agence Marketing 360', 'Conakry', '2019-03-01', NULL, true, ARRAY[
    'Gestion de projets web et mobile de A à Z',
    'Coordination d''équipes pluridisciplinaires (designers, développeurs, marketeurs)',
    'Suivi budgétaire et reporting client',
    'Amélioration de 40% de la satisfaction client'
  ]);

-- Formations
INSERT INTO education (candidate_id, degree, institution, location, start_date, end_date, is_current, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Licence en Informatique', 'Université Gamal Abdel Nasser de Conakry', 'Conakry', '2016-09-01', '2019-06-30', false, 'Spécialisation en développement web et bases de données'),
  ('00000000-0000-0000-0000-000000000002', 'Master en Management de Projets', 'École Supérieure de Commerce de Conakry', 'Conakry', '2017-09-01', '2019-06-30', false, 'Spécialisation en gestion de projets digitaux'),
  ('00000000-0000-0000-0000-000000000003', 'Licence en Comptabilité', 'Institut Supérieur de Commerce et d''Administration des Entreprises', 'Conakry', '2015-09-01', '2018-06-30', false, NULL);

-- Compétences
INSERT INTO skills (candidate_id, skill_name, level) VALUES
  ('00000000-0000-0000-0000-000000000001', 'React', 'avancé'),
  ('00000000-0000-0000-0000-000000000001', 'TypeScript', 'avancé'),
  ('00000000-0000-0000-0000-000000000001', 'Node.js', 'intermédiaire'),
  ('00000000-0000-0000-0000-000000000001', 'PostgreSQL', 'intermédiaire'),
  ('00000000-0000-0000-0000-000000000001', 'Git', 'avancé'),
  ('00000000-0000-0000-0000-000000000002', 'Gestion de projet', 'expert'),
  ('00000000-0000-0000-0000-000000000002', 'Scrum/Agile', 'avancé'),
  ('00000000-0000-0000-0000-000000000002', 'Communication', 'expert'),
  ('00000000-0000-0000-0000-000000000003', 'Comptabilité générale', 'avancé'),
  ('00000000-0000-0000-0000-000000000003', 'Sage Comptabilité', 'avancé'),
  ('00000000-0000-0000-0000-000000000003', 'Excel', 'expert');

-- Langues
INSERT INTO languages (candidate_id, language_name, level, proficiency_percentage) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Français', 'Courant', 95),
  ('00000000-0000-0000-0000-000000000001', 'Anglais', 'Intermédiaire', 70),
  ('00000000-0000-0000-0000-000000000002', 'Français', 'Courant', 100),
  ('00000000-0000-0000-0000-000000000002', 'Anglais', 'Avancé', 85),
  ('00000000-0000-0000-0000-000000000003', 'Français', 'Courant', 95),
  ('00000000-0000-0000-0000-000000000003', 'Anglais', 'Débutant', 40);

-- =====================================================
-- DONNÉES DE TEST - ENTREPRISES
-- =====================================================

INSERT INTO profiles (id, user_type, full_name, email, phone) VALUES
  ('00000000-0000-0000-0000-000000000010', 'company', 'Orange Guinée', 'recrutement@orange.gn', '+224622000001'),
  ('00000000-0000-0000-0000-000000000011', 'company', 'Tech Solutions GN', 'contact@techsolutions.gn', '+224622000002'),
  ('00000000-0000-0000-0000-000000000012', 'company', 'Banque Centrale de la République de Guinée', 'rh@bcrg.gov.gn', '+224622000003');

INSERT INTO company_profiles (id, company_name, sector, company_size, description, website) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Orange Guinée', 'Télécommunications', '200+ employés', 'Leader des télécommunications en Guinée, Orange Guinée offre des services de téléphonie mobile, internet et solutions entreprises.', 'https://www.orange.gn'),
  ('00000000-0000-0000-0000-000000000011', 'Tech Solutions GN', 'IT / Technologie', '51-200 employés', 'Entreprise innovante spécialisée dans le développement de solutions digitales pour les entreprises guinéennes.', 'https://www.techsolutions.gn'),
  ('00000000-0000-0000-0000-000000000012', 'Banque Centrale de la République de Guinée', 'Banque / Finance', '200+ employés', 'La Banque Centrale de la République de Guinée est l''institution monétaire de référence en Guinée.', 'https://www.bcrg.gov.gn');

-- =====================================================
-- DONNÉES DE TEST - OFFRES D'EMPLOI
-- =====================================================

INSERT INTO jobs (id, company_id, title, description, location, job_type, experience_level, salary_min, salary_max, requirements, responsibilities, benefits, is_active) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011', 'Développeur Web Junior', 'Rejoignez notre équipe de développement pour créer des applications web innovantes.', 'Conakry', 'CDI', 'Débutant', 2000000, 3000000,
  ARRAY['Licence en informatique ou équivalent', 'Connaissance de React ou Vue.js', 'Bases en JavaScript/TypeScript', 'Motivation et esprit d''équipe'],
  ARRAY['Développer des interfaces utilisateur modernes', 'Collaborer avec l''équipe backend', 'Participer aux code reviews', 'Apprendre et appliquer les meilleures pratiques'],
  ARRAY['Formation continue', 'Environnement de travail moderne', 'Équipe jeune et dynamique', 'Projets stimulants'],
  true),

  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 'Assistant Commercial', 'Orange Guinée recherche un assistant commercial pour renforcer son équipe commerciale.', 'Conakry', 'CDI', 'Intermédiaire', 2500000, 4000000,
  ARRAY['Bac+2 minimum en Commerce/Marketing', '2-3 ans d''expérience en vente', 'Excellentes compétences en communication', 'Maîtrise de MS Office'],
  ARRAY['Gérer et développer le portefeuille clients', 'Atteindre les objectifs de vente', 'Assurer le suivi des commandes', 'Participer aux campagnes commerciales'],
  ARRAY['Salaire attractif + commissions', 'Assurance santé', 'Formation continue', 'Évolution de carrière'],
  true),

  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000012', 'Comptable', 'La BCRG recrute un comptable pour son département financier.', 'Conakry', 'CDI', 'Confirmé', 3000000, 5000000,
  ARRAY['Licence en Comptabilité/Finance', '3-5 ans d''expérience en comptabilité', 'Maîtrise des normes comptables', 'Expérience avec logiciels comptables'],
  ARRAY['Tenir la comptabilité générale', 'Préparer les états financiers', 'Assurer les déclarations fiscales', 'Participer aux audits'],
  ARRAY['Statut de fonctionnaire', 'Avantages sociaux', 'Environnement professionnel', 'Stabilité de l''emploi'],
  true),

  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000011', 'Chef de Projet IT', 'Nous recherchons un chef de projet expérimenté pour piloter nos projets digitaux.', 'Conakry', 'CDI', 'Expert', 4000000, 7000000,
  ARRAY['Master en Informatique/Gestion de projet', '5+ ans d''expérience en gestion de projet IT', 'Certification PMP ou équivalent souhaitée', 'Maîtrise de l''anglais'],
  ARRAY['Piloter les projets de A à Z', 'Manager les équipes projet', 'Gérer les budgets et délais', 'Assurer la satisfaction client'],
  ARRAY['Salaire compétitif', 'Bonus sur objectifs', 'Formation continue', 'Opportunités internationales'],
  true),

  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000010', 'Stage Marketing Digital', 'Orange Guinée offre une opportunité de stage en marketing digital.', 'Conakry', 'Stage', 'Débutant', 500000, 800000,
  ARRAY['Étudiant en Marketing/Communication (Bac+3 minimum)', 'Bonne maîtrise des réseaux sociaux', 'Créativité et dynamisme', 'Connaissance de base des outils digitaux'],
  ARRAY['Assister l''équipe marketing dans les campagnes', 'Gérer les réseaux sociaux', 'Créer du contenu', 'Analyser les performances'],
  ARRAY['Expérience dans une grande entreprise', 'Encadrement professionnel', 'Possibilité d''embauche', 'Indemnité de stage'],
  true);

-- Compétences requises pour les emplois
INSERT INTO job_skills (job_id, skill_name, is_required) VALUES
  ('00000000-0000-0000-0000-000000000101', 'React', true),
  ('00000000-0000-0000-0000-000000000101', 'JavaScript', true),
  ('00000000-0000-0000-0000-000000000101', 'HTML/CSS', true),
  ('00000000-0000-0000-0000-000000000101', 'Git', true),
  ('00000000-0000-0000-0000-000000000102', 'Communication', true),
  ('00000000-0000-0000-0000-000000000102', 'Vente', true),
  ('00000000-0000-0000-0000-000000000102', 'MS Office', true),
  ('00000000-0000-0000-0000-000000000103', 'Comptabilité', true),
  ('00000000-0000-0000-0000-000000000103', 'Excel', true),
  ('00000000-0000-0000-0000-000000000103', 'Sage Comptabilité', false),
  ('00000000-0000-0000-0000-000000000104', 'Gestion de projet', true),
  ('00000000-0000-0000-0000-000000000104', 'Scrum/Agile', true),
  ('00000000-0000-0000-0000-000000000104', 'Leadership', true),
  ('00000000-0000-0000-0000-000000000105', 'Réseaux sociaux', true),
  ('00000000-0000-0000-0000-000000000105', 'Marketing digital', true),
  ('00000000-0000-0000-0000-000000000105', 'Créativité', true);

-- =====================================================
-- DONNÉES DE TEST - CANDIDATURES
-- =====================================================

INSERT INTO applications (job_id, candidate_id, status, motivation_message) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'reviewed', 'Je suis très motivé à rejoindre Tech Solutions GN pour développer mes compétences en React.'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'shortlisted', 'Mon expérience en gestion de projets sera un atout pour votre équipe commerciale.'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000003', 'interview', 'Ma rigueur et mon expérience correspondent parfaitement aux exigences du poste.');

-- =====================================================
-- DONNÉES DE TEST - NOTIFICATIONS
-- =====================================================

INSERT INTO notifications (user_id, type, title, message, link) VALUES
  ('00000000-0000-0000-0000-000000000001', 'application', 'Candidature envoyée', 'Votre candidature pour Développeur Web Junior a été envoyée avec succès.', '/applications'),
  ('00000000-0000-0000-0000-000000000001', 'job_match', 'Nouvelle offre correspondante', 'Une nouvelle offre correspondant à votre profil : Chef de Projet IT', '/jobs/00000000-0000-0000-0000-000000000104'),
  ('00000000-0000-0000-0000-000000000010', 'application', 'Nouvelle candidature', 'Vous avez reçu une nouvelle candidature pour le poste d''Assistant Commercial.', '/company/applications');

*/

-- =====================================================
-- VÉRIFICATION DES DONNÉES
-- =====================================================

-- Pour vérifier que les données ont été insérées :
/*
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT COUNT(*) as total_candidates FROM candidate_profiles;
SELECT COUNT(*) as total_companies FROM company_profiles;
SELECT COUNT(*) as total_jobs FROM jobs WHERE is_active = true;
SELECT COUNT(*) as total_applications FROM applications;
*/
