import {
  createContext,
  useState,
  type ReactNode,
} from "react";

type AuthContextType = {
  token: string | null;
  saveToken: (token: string) => void;
  logout: () => void;
};

export const AuthContext =
  createContext<AuthContextType>(
    {} as AuthContextType
  );

type Props = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: Props) {

  const [token, setToken] =
    useState<string | null>(
      localStorage.getItem("token")
    );

  const saveToken = (jwt: string) => {
    localStorage.setItem("token", jwt);
    setToken(jwt);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        saveToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}