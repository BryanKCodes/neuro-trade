import Link from "next/link";

const Footer = () => {
  return (
    <footer className="border-t border-border-subtle bg-surface-base px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs text-content-muted sm:flex-row">
        <span className="font-semibold tracking-tight text-content-primary">
          Neuro<span className="text-accent-blue">Trade</span>
        </span>

        <nav className="flex gap-6">
          <Link href="/" className="transition-colors hover:text-content-primary">
            Home
          </Link>
          <Link href="/about" className="transition-colors hover:text-content-primary">
            About
          </Link>
          <Link href="/auth/login" className="transition-colors hover:text-content-primary">
            Sign In
          </Link>
          <Link href="/auth/signup" className="transition-colors hover:text-content-primary">
            Sign Up
          </Link>
        </nav>

        <span>© {new Date().getFullYear()} NeuroTrade. All rights reserved.</span>
      </div>
    </footer>
  );
};

export default Footer;
