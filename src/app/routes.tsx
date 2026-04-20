import { createBrowserRouter } from "react-router";
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
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      {
        path: "/",
        Component: Home,
      },
      {
        path: "/pricing",
        Component: Pricing,
      },
      {
        path: "/profile-choice",
        Component: ProfileChoice,
      },
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/signup-candidate",
        Component: SignUpCandidate,
      },
      {
        path: "/signup-company",
        Component: SignUpCompany,
      },
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
            <InterviewPrep />
          </ProtectedRoute>
        ),
      },
      {
        path: "/jobs",
        Component: JobList,
      },
      {
        path: "/jobs/:id",
        Component: JobDetail,
      },
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
        path: "/company/search-profiles",
        element: (
          <ProtectedRoute type="company">
            <SearchProfiles />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
