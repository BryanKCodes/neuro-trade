import { ReactNode } from 'react';

interface SubmitButtonProps {
  children: ReactNode;
}

const SubmitButton = ({ children }: SubmitButtonProps) => {
  return (
    <button
      type="submit"
      className="mt-10 w-full rounded-lg bg-blue-600 p-3 text-white text-sm hover:bg-blue-700 transition"
    >
      {children}
    </button>
  );
};

export default SubmitButton;
