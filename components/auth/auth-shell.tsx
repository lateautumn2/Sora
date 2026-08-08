import Link from "next/link";

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-shell-surface">
        <Link className="auth-shell-brand" href="/">
          Sora
        </Link>
        <h1>{title}</h1>
        <p className="auth-shell-description">{description}</p>
        {children}
      </section>
    </main>
  );
}
