import Link from "next/link";

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main
      className="grid min-h-screen place-items-center bg-[var(--surface)] px-5 py-10"
      id="main-content"
    >
      <section className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <Link className="font-serif text-lg font-semibold" href="/">
          Sora
        </Link>
        <h1 className="mt-8 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        {children}
      </section>
    </main>
  );
}
