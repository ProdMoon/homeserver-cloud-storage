import styles from "./EmptyState.module.css";

export function EmptyState({
  title,
  description,
  children
}: {
  title?: string;
  description: string;
  children?: string;
}) {
  return (
    <div className={styles.emptyState}>
      {title ? <h3>{title}</h3> : null}
      <p>{description}</p>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

