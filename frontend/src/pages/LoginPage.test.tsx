import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../lib/auth.tsx";
import { LoginPage } from "./LoginPage";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs in and navigates home on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ user: { id: "u1", email: "a@b.com", name: "A", role: "USER" }, token: "tok" })
    );
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByText("Home Page")).toBeInTheDocument());
  });

  it("shows the server's error message on failed login", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "Invalid email or password" }, 401));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByText("Invalid email or password")).toBeInTheDocument());
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });
});
