import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ethara_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("ethara_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    login(data) {
      localStorage.setItem("ethara_token", data.token);
      setUser(data.user);
    },
    logout() {
      localStorage.removeItem("ethara_token");
      setUser(null);
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

