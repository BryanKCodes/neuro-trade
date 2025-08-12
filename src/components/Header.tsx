export default function Header() {
  return (
    <header className="w-full flex justify-between items-center px-6 py-2 bg-gray-100 dark:bg-gray-900 shadow">
      <h1 className="text-xl font-bold text-black dark:text-white">NeuroTrade</h1>
      <button className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
        <svg className="w-6 h-6 text-black dark:text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </header>
  );
}
