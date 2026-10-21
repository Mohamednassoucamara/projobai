import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { CVDataProvider } from "./contexts/CVDataContext";
import { PlanProvider } from "./contexts/PlanContext";

export default function App() {
  return (
    <AuthProvider>
      <PlanProvider>
        <CVDataProvider>
          <RouterProvider router={router} />
        </CVDataProvider>
      </PlanProvider>
    </AuthProvider>
  );
}