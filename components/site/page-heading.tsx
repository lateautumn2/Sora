interface PageHeadingProps {
  title: string;
  description?: string;
}

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <header className="mb-10 border-b border-[var(--border)] pb-5">
      <h1 className="font-serif text-3xl font-semibold">{title}</h1>
      {description ? <p className="mt-2 leading-7 text-[var(--muted)]">{description}</p> : null}
    </header>
  );
}
