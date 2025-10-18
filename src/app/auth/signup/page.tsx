"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { handleEmailPasswordSignUp, handleGoogleSignIn } from "@/scripts/auth";

import NameInput from "@/components/auth/NameInput";
import EmailInput from "@/components/auth/EmailInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SubmitButton from "@/components/auth/SubmitButton";
import GoogleButton from "@/components/auth/GoogleButton";

const SignUpPage = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await handleEmailPasswordSignUp(name, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This email address is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Failed to create an account. Please try again.");
      }
    }
  };

  const onGoogleSignIn = async () => {
    try {
      await handleGoogleSignIn();
      router.push("/dashboard");
    } catch (err: any) {
      setError("Google sign-in failed. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white py-8 px-15 dark:bg-slate-900">
      <p className="text-m text-gray-500 mb-1">Please enter your details to create an account</p>
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-10">
        Create an Account
      </h1>

      <form onSubmit={handleSignUp} className="space-y-4">
        <NameInput value={name} onChange={(e) => setName(e.target.value)} />
        <EmailInput value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
        
        {error && <p className="text-sm text-red-500">{error}</p>}
        
        <SubmitButton>Sign Up</SubmitButton>
      </form>

      <div className="my-6 flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
        <span>Already have an account?</span>
        <Link href="/auth/login" className="ml-1 font-medium text-blue-600 hover:underline">
          <u>Log in</u>
        </Link>
      </div>

      <div className="flex items-center justify-center gap-2 my-4 text-gray-400">
        <span className="h-px w-1/3 bg-gray-200 dark:bg-gray-700" />
        <span className="text-sm">or</span>
        <span className="h-px w-1/3 bg-gray-200 dark:bg-gray-700" />
      </div>

      <GoogleButton onClick={onGoogleSignIn} />
    </div>
  );
}

export default SignUpPage;
