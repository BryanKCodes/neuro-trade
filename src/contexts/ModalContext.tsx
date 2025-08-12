"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type ModalContextType = {
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = (modalContent: ReactNode) => {
    setContent(modalContent);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => setContent(null), 200);
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {mounted &&
        createPortal(
          <div
            className={clsx(
              "fixed inset-0 z-50 flex items-center justify-center transition-colors",
              isOpen ? "bg-black/50 visible" : "bg-black/0 invisible"
            )}
            onClick={closeModal}
          >
            <div
              className={clsx(
                "bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 max-w-lg w-full transition-transform",
                isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {content}
            </div>
          </div>,
          document.body
        )}
    </ModalContext.Provider>
  );
}

