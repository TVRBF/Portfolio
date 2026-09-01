/* eslint-disable react-refresh/only-export-components */

import { createContext, useState } from "react";

export const AuthContext = createContext();

const storedUser = localStorage.getItem("user");

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    storedUser ? JSON.parse(storedUser) : null
  );

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;