export function EmptyState({
  title,
  description,
  children,
}: {
  title?: string;
  description: string;
  children?: string;
}) {
  return (
    <div className="px-6 py-11 text-center text-ink-subtle">
      {title ? <h3 className="mb-2 text-lg font-semibold text-ink">{title}</h3> : null}
      <p className="m-0">{description}</p>
      {children ? <p className="mt-2">{children}</p> : null}
    </div>
  );
}
