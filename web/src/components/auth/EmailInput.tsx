import { ChangeEvent } from 'react';

interface EmailInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const EmailInput = ({ value, onChange }: EmailInputProps) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Email address
      </label>
      <input
        type="email"
        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-gray-100"
        value={value}
        onChange={onChange}
        placeholder="Email"
        required
      />
    </div>
  );
};

export default EmailInput;
