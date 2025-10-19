import { ChangeEvent } from "react";

interface NameInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const NameInput = ({ value, onChange }: NameInputProps) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Full name
      </label>
      <input
        type="text"
        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-gray-100"
        value={value}
        onChange={onChange}
        placeholder="Name"
        required
      />
    </div>
  );
};

export default NameInput;
