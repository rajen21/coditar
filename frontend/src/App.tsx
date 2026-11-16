import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProblemListPage } from "./pages/ProblemListPage";
import { ProblemDetailPage } from "./pages/ProblemDetailPage";
import { SubmissionHistoryPage } from "./pages/SubmissionHistoryPage";
import { SubmissionDetailPage } from "./pages/SubmissionDetailPage";
import { AdminCreateProblemPage } from "./pages/AdminCreateProblemPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<ProblemListPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/submissions" element={<SubmissionHistoryPage />} />
          <Route path="/submissions/:id" element={<SubmissionDetailPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin/problems/new" element={<AdminCreateProblemPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
