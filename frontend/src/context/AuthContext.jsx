import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authMe, authLogin, authRegister, authLogout, authGoogleExchange } from "@/lib/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // null = unknown, false = guest, object = user
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await authMe();
      setUser(u);
    } catch (e) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we're returning from an OAuth callback (URL fragment #session_id=…),
    // let AuthCallback handle it. Skip the /me probe to avoid a 401 race.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const u = await authLogin(email, password);
    setUser(u);
    return u;
  };

  const register = async (email, password, name) => {
    const u = await authRegister(email, password, name);
    setUser(u);
    return u;
  };

  const finishGoogleLogin = async (sessionId) => {
    const u = await authGoogleExchange(sessionId);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await authLogout(); } catch { /* ignore */ }
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, finishGoogleLogin, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
