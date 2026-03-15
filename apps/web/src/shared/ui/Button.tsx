import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import styles from "./Button.module.css";

type Variant = "primary" | "ghost" | "danger" | "nav";

interface SharedButtonProps {
  variant?: Variant;
  active?: boolean;
  className?: string;
}

type ButtonProps = SharedButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;
type LinkButtonProps = SharedButtonProps & AnchorHTMLAttributes<HTMLAnchorElement>;

export function Button({ variant = "ghost", active = false, className, ...props }: ButtonProps) {
  return <button className={cn(styles.button, styles[variant], active && styles.active, className)} {...props} />;
}

export function LinkButton({ variant = "ghost", active = false, className, ...props }: LinkButtonProps) {
  return <a className={cn(styles.button, styles[variant], active && styles.active, className)} {...props} />;
}

