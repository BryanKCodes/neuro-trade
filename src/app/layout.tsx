import "./globals.css";
import { ModalProvider } from "@/contexts/ModalContext";

export const metadata = {
  title: "My Web App",
  description: "Next.js App Router layout",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ModalProvider>
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}
