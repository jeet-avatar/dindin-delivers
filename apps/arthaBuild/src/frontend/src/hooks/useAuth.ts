import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentUser, login as svcLogin, logout as svcLogout } from "../services/authService";
import type { User } from "../types/user";

interface LoginData {
  username: string;
  password: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => currentUser());
  const navigate = useNavigate();

  useEffect(() => {
    setUser(currentUser());
  }, []);

  // When api.ts dispatches auth:logout (401 response), clear state and redirect
  useEffect(() => {
    function handleSessionExpired() {
      svcLogout();
      setUser(null);
      navigate("/log-in");
    }
    window.addEventListener("auth:logout", handleSessionExpired);
    return () => window.removeEventListener("auth:logout", handleSessionExpired);
  }, [navigate]);

  async function login(credentials: LoginData) {
    const res = await svcLogin(credentials);
    // svcLogin returns { ...backendData, user: {name, first_name, last_name, role, email} }
    setUser(res.user ?? null);
    return res.user;
  }

  async function logout() {
    await svcLogout();
    setUser(null);
  }

  return { user, login, logout };
}
