import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { CVDataProvider } from "./contexts/CVDataContext";

export default function App() {
  return (
    <AuthProvider>
      <CVDataProvider>
        <RouterProvider router={router} />
      </CVDataProvider>
    </AuthProvider>
  );
}