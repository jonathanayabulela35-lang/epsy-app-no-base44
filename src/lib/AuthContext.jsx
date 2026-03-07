import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("epsy_user");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: "auth_required",
          message: "Authentication required",
        });
      }
    } catch (e) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: "auth_error",
        message: e?.message || "Authentication error",
      });
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      logout: async () => {
        localStorage.removeItem("epsy_user");
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: "auth_required",
          message: "Authentication required",
        });
        window.location.href = "/";
      },
      navigateToLogin: () => {
        window.location.href = "/";
      },
    }),
    [user, isAuthenticated, isLoadingAuth, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}