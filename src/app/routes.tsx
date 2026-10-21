import { createBrowserRouter, redirect } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ProfileChoice from "./pages/ProfileChoice";
import Login from "./pages/Login";
import SignUpCandidate from "./pages/SignUpCandidate";
import SignUpCompany from "./pages/SignUpCompany";
import DashboardCandidate from "./pages/DashboardCandidate";
import CVAssistant from "./pages/CVAssistant";
import CVPreview from "./pages/CVPreview";
import CVEdit from "./pages/CVEdit";
import CoverLetter from "./pages/CoverLetter";
import InterviewPrep from "./pages/InterviewPrep";
import JobList from "./pages/JobList";
import JobDetail from "./pages/JobDetail";
import DashboardCompany from "./pages/DashboardCompany";
import PostJob from "./pages/PostJob";
import SearchProfiles from "./pages/SearchProfiles";
import Pricing from "./pages/Pricing";
import CareerOrientation from "./pages/CareerOrientation";
import ApplicationDossier from "./pages/ApplicationDossier";
import CompanyInterviews from "./pages/CompanyInterviews";
import CompanyStats from "./pages/CompanyStats";
import CVAdapt from "./pages/CVAdapt";
import Subscription from "./pages/Subscription";
import PaymentReturn from "./pages/PaymentReturn";
import { PremiumPage } from "./components/PremiumGate";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RouteErrorBoundary from "./components/RouteErrorBoundary";

/** Pages auth sans widgets (Botpress/WhatsApp) pour éviter les conflits DOM. */
const authRoutes = [
  { path: "/login", Component: Login },
  { path: "/signup-candidate", Component: SignUpCandidate },
  { path: "/signup-company", Component: SignUpCompany },
  {
    path: "/signup/confirmation",
    loader: () => redirect("/"),
  },
] as const;

export const router = createBrowserRouter([
  ...authRoutes.map((route) => ({
    ...route,
    errorElement: <RouteErrorBoundary />,
  })),
  {
    Component: Layout,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", Component: Home },
      { path: "/pricing", Component: Pricing },
      { path: "/profile-choice", Component: ProfileChoice },
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute type="candidate">
            <DashboardCandidate />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cv-assistant",
        element: (
          <ProtectedRoute type="candidate">
            <CVAssistant />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cv-preview",
        element: (
          <ProtectedRoute type="candidate">
            <CVPreview />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cv-edit",
        element: (
          <ProtectedRoute type="candidate">
            <CVEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cover-letter",
        element: (
          <ProtectedRoute type="candidate">
            <CoverLetter />
          </ProtectedRoute>
        ),
      },
      {
        path: "/interview-prep",
        element: (
          <ProtectedRoute type="candidate">
            <PremiumPage feature="interview_coach" description="Entraînez-vous sur des questions adaptées au poste : l'IA note chaque réponse et vous conseille."><InterviewPrep /></PremiumPage>
          </ProtectedRoute>
        ),
      },
      {
        path: "/orientation",
        element: (
          <ProtectedRoute type="candidate">
            <PremiumPage feature="career_coach" description="Analyse de votre profil, métiers recommandés sur le marché guinéen et conseiller IA pour bâtir votre plan de carrière."><CareerOrientation /></PremiumPage>
          </ProtectedRoute>
        ),
      },
      { path: "/jobs", Component: JobList },
      { path: "/jobs/:id", Component: JobDetail },
      {
        path: "/company/dashboard",
        element: (
          <ProtectedRoute type="company">
            <DashboardCompany />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/post-job",
        element: (
          <ProtectedRoute type="company">
            <PostJob />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/jobs/:id/edit",
        element: (
          <ProtectedRoute type="company">
            <PostJob />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/search-profiles",
        element: (
          <ProtectedRoute type="company">
            <SearchProfiles />
          </ProtectedRoute>
        ),
      },
      {
        path: "/abonnement",
        element: (
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        ),
      },
      {
        path: "/abonnement/retour",
        element: (
          <ProtectedRoute>
            <PaymentReturn />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/applications/:id",
        element: (
          <ProtectedRoute type="company">
            <ApplicationDossier />
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/interviews",
        element: (
          <ProtectedRoute type="company">
            <PremiumPage feature="interviews" description="Planifiez les entretiens (visio, présentiel, téléphone), suivez l'agenda et évaluez les candidats."><CompanyInterviews /></PremiumPage>
          </ProtectedRoute>
        ),
      },
      {
        path: "/company/stats",
        element: (
          <ProtectedRoute type="company">
            <PremiumPage feature="hr_stats" description="Conversion par étape, délais de recrutement, coût par recrutement et sources des candidatures."><CompanyStats /></PremiumPage>
          </ProtectedRoute>
        ),
      },
      {
        path: "/cv-adapt/:id",
        element: (
          <ProtectedRoute type="candidate">
            <PremiumPage feature="ai_cv" description="L'IA adapte votre profil, vos compétences et vos missions à chaque offre, sans rien inventer."><CVAdapt /></PremiumPage>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
