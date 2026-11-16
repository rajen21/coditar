import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../lib/auth.tsx";
import { AdminRoute, ProtectedRoute } from "./ProtectedRoute";
import { setToken } from "../lib/api";

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>Secret Content</div>} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<div>Admin Content</div>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("redirects to /login when no token is stored", () => {
    renderApp("/secret");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders the protected content when a token is stored", () => {
    setToken("tok");
    renderApp("/secret");
    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });
});

describe("AdminRoute", () => {
  it("redirects a non-admin user to /", () => {
    setToken("tok");
    localStorage.setItem("coditar_user", JSON.stringify({ id: "u1", email: "a@b.com", name: "A", role: "USER" }));
    renderApp("/admin");
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  it("renders admin content for an admin user", () => {
    setToken("tok");
    localStorage.setItem("coditar_user", JSON.stringify({ id: "u1", email: "a@b.com", name: "A", role: "ADMIN" }));
    renderApp("/admin");
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });
});
