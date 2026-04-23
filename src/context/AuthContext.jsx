import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, signIn as svcSignIn, signOut as svcSignOut } from '../services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate auth state check
    const u = getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    const u = await svcSignIn(email, password);
    setUser(u);
    setLoading(false);
    return u;
  };

  const signOut = async () => {
    await svcSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
