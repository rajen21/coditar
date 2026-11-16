/* eslint-disable react-refresh/only-export-components -- context + hook pairing is the idiomatic shape here */
import { createContext, useContext, useState, type ReactNode } from "react";
import { apiFetch, setToken, getToken } from "./api";
import type { AuthResponse, User } from "./types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_STORAGE_KEY = "coditar_user";

function loadStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser);
  const [token, setTokenState] = useState<string | null>(getToken);

  function applyAuth(res: AuthResponse) {
    setToken(res.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    setTokenState(res.token);
    setUser(res.user);
  }

  async function login(email: string, password: string) {
    const res = await apiFetch<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
    applyAuth(res);
  }

  async function register(email: string, password: string, name: string) {
    const res = await apiFetch<AuthResponse>("/auth/register", { method: "POST", body: { email, password, name } });
    applyAuth(res);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setTokenState(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
