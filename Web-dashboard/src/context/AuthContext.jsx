import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { signIn as svcSignIn, signOut as svcSignOut } from '../services';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Read role from Firestore, same as login flow
      const roleDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const role    = roleDoc.exists() ? roleDoc.data().role ?? 'standard' : 'standard';

      setUser({
        uid:      firebaseUser.uid,
        name:     firebaseUser.displayName ?? firebaseUser.email.split('@')[0],
        initials: firebaseUser.email.slice(0, 2).toUpperCase(),
        email:    firebaseUser.email,
        role,
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  });
  return unsub;
}, []);;

  const signIn = async (email, password) => {
    await svcSignIn(email, password);
    // onAuthStateChanged will automatically update user state
  };

  const signOut = async () => {
    await svcSignOut();
    // onAuthStateChanged will automatically set user to null
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);