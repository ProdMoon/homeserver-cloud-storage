export function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-[14px] border border-danger/20 bg-danger-wash px-3.5 py-3 text-sm font-medium text-danger">{message}</div>;
}
