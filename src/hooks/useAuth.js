import { useState, useEffect, useCallback } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const ORG_ID = "trojan-debate";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);

  // Auto sign-in anonymously and check if already an admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Check if this UID is already in the admins map
        try {
          const orgDoc = await getDoc(doc(db, "organizations", ORG_ID));
          if (orgDoc.exists()) {
            const admins = orgDoc.data().admins || {};
            if (admins[firebaseUser.uid]) {
              setIsAdmin(true);
              setAdminName(admins[firebaseUser.uid].displayName);
            }
          }
        } catch (err) {
          console.error("Error checking admin status:", err);
        }
        setLoading(false);
      } else {
        // No user yet — sign in anonymously
        // Success triggers onAuthStateChanged again with the new user
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous auth failed:", err);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginAsAdmin = useCallback(
    async (code, displayName) => {
      if (!user) throw new Error("Not authenticated");

      const orgRef = doc(db, "organizations", ORG_ID);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        throw new Error("Organization not found. Ask an admin to set up the organization.");
      }

      const orgData = orgDoc.data();
      if (orgData.adminCode !== code) {
        throw new Error("Incorrect admin code");
      }

      // Code is correct — add this UID to admins map
      await updateDoc(orgRef, {
        [`admins.${user.uid}`]: {
          displayName,
          grantedAt: new Date().toISOString(),
        },
      });

      setIsAdmin(true);
      setAdminName(displayName);
    },
    [user]
  );

  const logout = useCallback(async () => {
    // Remove this UID from the admins map so reload doesn't auto-restore
    if (user) {
      try {
        const orgRef = doc(db, "organizations", ORG_ID);
        await updateDoc(orgRef, {
          [`admins.${user.uid}`]: deleteField(),
        });
      } catch (err) {
        console.error("Error removing admin status:", err);
      }
    }
    setIsAdmin(false);
    setAdminName("");
  }, [user]);

  return { user, isAdmin, adminName, loading, loginAsAdmin, logout };
}
