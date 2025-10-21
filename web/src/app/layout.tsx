import { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { UserProvider } from "@/contexts/UserContext";

export const metadata = {
  title: "My Web App",
  description: "Next.js App Router layout",
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <UserProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

export default RootLayout;
