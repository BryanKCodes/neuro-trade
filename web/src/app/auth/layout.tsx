import { ReactNode } from "react";
import Header from "@/components/auth/Header";

type AuthLayoutProps = {
    children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4">
        {children}
      </main>
    </div>
  );
}

export default AuthLayout;
