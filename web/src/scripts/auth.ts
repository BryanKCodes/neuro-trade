import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  UserCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const ensureUserDocument = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      createdAt: new Date().toISOString(),
    });
  }
};

export const handleEmailPasswordSignUp = async (
  name: string, email: string, password: string
): Promise<UserCredential> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (user) {
    await updateProfile(user, { displayName: name });
  }

  await ensureUserDocument(user.uid);

  return userCredential;
};

export const handleEmailPasswordSignIn = (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const handleGoogleSignIn = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;

  await ensureUserDocument(user.uid);

  return userCredential;
};

export const handleSignOut = (): Promise<void> => {
  return signOut(auth);
};
