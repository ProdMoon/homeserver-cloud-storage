import { useId, useState, type FormEvent } from "react";
import { selectAuthBusy, selectError, selectLogin } from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import { Button } from "../../../shared/ui/Button";
import { ErrorBanner } from "../../../shared/ui/ErrorBanner";

export function LoginScreen() {
  const usernameId = useId();
  const passwordId = useId();
  const busy = useAppStore(selectAuthBusy);
  const error = useAppStore(selectError);
  const login = useAppStore(selectLogin);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login(username, password);
  }

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] bg-[rgba(9,25,41,0.88)] p-9 text-sidebar-text shadow-cloud">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[12%] -bottom-[36%] h-[220px] w-[220px] rotate-[12deg] rounded-full bg-[radial-gradient(circle,rgba(234,152,71,0.7),transparent_70%)]"
        />
        <div className="relative z-10">
          <div className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent">Pi Home Drive</div>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">
            Private storage without the cloud rent.
          </h1>
          <p className="mt-4 max-w-[34ch] text-sidebar-copy">
            Browse, preview, upload, and recover files from your Raspberry Pi with one admin account and a clean
            remote explorer.
          </p>
          <form className="grid gap-2.5" onSubmit={handleSubmit}>
            <label className="text-[0.95rem]" htmlFor={usernameId}>
              Username
            </label>
            <input
              className="rounded-[14px] border border-white/12 bg-white/8 px-4 py-3.5 text-inherit outline-none transition focus:border-accent/50 focus:bg-white/12"
              id={usernameId}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <label className="text-[0.95rem]" htmlFor={passwordId}>
              Password
            </label>
            <input
              className="rounded-[14px] border border-white/12 bg-white/8 px-4 py-3.5 text-inherit outline-none transition focus:border-accent/50 focus:bg-white/12"
              id={passwordId}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error ? <ErrorBanner message={error} /> : null}
            <Button disabled={busy} type="submit" variant="primary">
              {busy ? "Signing in..." : "Enter Drive"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
