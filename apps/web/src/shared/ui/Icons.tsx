import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type IconProps = {
  className?: string;
};

interface BaseIconProps extends IconProps {
  children: ReactNode;
}

function Icon({ className, children }: BaseIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export function FilesIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.75 7.5a2.25 2.25 0 0 1 2.25-2.25h4.1c.6 0 1.17.24 1.6.67l1.02 1.02c.42.42 1 .66 1.6.66H18a2.25 2.25 0 0 1 2.25 2.25v6.65A2.25 2.25 0 0 1 18 18.75H6A2.25 2.25 0 0 1 3.75 16.5Z" />
      <path d="M3.75 9.75h16.5" />
    </Icon>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5.25 7.5h13.5" />
      <path d="M9.75 10.5v4.5" />
      <path d="M14.25 10.5v4.5" />
      <path d="M6.75 7.5 7.5 18a2.25 2.25 0 0 0 2.24 2.1h4.52A2.25 2.25 0 0 0 16.5 18l.75-10.5" />
      <path d="M9 7.5V5.62c0-.76.62-1.37 1.38-1.37h3.24c.76 0 1.38.61 1.38 1.37V7.5" />
    </Icon>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M20.25 6.75v4.5h-4.5" />
      <path d="M3.75 17.25v-4.5h4.5" />
      <path d="M18.4 10.5A6.75 6.75 0 0 0 7.27 7.87L3.75 10.5" />
      <path d="M5.6 13.5a6.75 6.75 0 0 0 11.13 2.63l3.52-2.63" />
    </Icon>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10.5 5.25H7.88A2.63 2.63 0 0 0 5.25 7.88v8.24a2.63 2.63 0 0 0 2.63 2.63h2.62" />
      <path d="M13.5 8.25 18 12l-4.5 3.75" />
      <path d="M18 12H9.75" />
    </Icon>
  );
}
