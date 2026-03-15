import { useId, useState, type FormEvent } from "react";
import { selectAuthBusy, selectError, selectLogin } from "../../../app/store/selectors";
import { useAppStore } from "../../../app/store/useAppStore";
import { Button } from "../../../shared/ui/Button";
import { ErrorBanner } from "../../../shared/ui/ErrorBanner";
import styles from "./LoginScreen.module.css";

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
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Pi Home Drive</div>
        <h1>Private storage without the cloud rent.</h1>
        <p className={styles.copy}>
          Browse, preview, upload, and recover files from your Raspberry Pi with one admin account and a clean
          remote explorer.
        </p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor={usernameId}>Username</label>
          <input id={usernameId} value={username} onChange={(event) => setUsername(event.target.value)} />
          <label htmlFor={passwordId}>Password</label>
          <input
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
      </section>
    </main>
  );
}

