import { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(false);
    const [dbUser, setDbUser] = useState(null);
    const [dbUserLoading, setDbUserLoading] = useState(false);

    // Sync user with backend
    const syncUserToBackend = async (user) => {
        setDbUserLoading(true);
        try {
            const response = await fetch('https://knoktalkend.onrender.com/api/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || ''
                })
            });
            const data = await response.json();
            setDbUser(data);
        } catch (error) {
            console.error('Error syncing user:', error);
        } finally {
            setDbUserLoading(false);
        }
    };

    // Fetch user from backend
    const fetchDbUser = async (uid) => {
        setDbUserLoading(true);
        try {
            const response = await fetch(`https://knoktalkend.onrender.com/api/users/me/${uid}`);
            if (response.ok) {
                const data = await response.json();
                setDbUser(data);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setDbUserLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Use fetchDbUser to get existing data without overwriting
                await fetchDbUser(user.uid);
            } else {
                setDbUser(null);
            }
            setLoading(false);
            setPending(false);
        });

        return unsubscribe;
    }, []);

    const signup = async (email, password) => {
        setPending(true);
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await syncUserToBackend(result.user);
        return result;
    };

    const login = async (email, password) => {
        setPending(true);
        const result = await signInWithEmailAndPassword(auth, email, password);
        await fetchDbUser(result.user.uid);
        return result;
    };

    const loginWithGoogle = async () => {
        setPending(true);
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await syncUserToBackend(result.user);
        return result;
    };

    const logout = async () => {
        setDbUser(null);
        return signOut(auth);
    };

    const resetPassword = async (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    const updateDbUser = (userData) => {
        setDbUser(userData);
    };

    const value = {
        currentUser,
        dbUser,
        dbUserLoading,
        loading,
        pending,
        signup,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        updateDbUser,
        fetchDbUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
