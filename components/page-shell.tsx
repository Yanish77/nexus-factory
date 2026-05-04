export function PageShell({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-normal">{title}</h1>
        <p className="mt-2 max-w-3xl text-stone-700">{description}</p>
      </div>
      {children}
    </section>
  );
}
