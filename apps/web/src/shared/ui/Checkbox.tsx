import type { KeyboardEvent } from 'react';
import { cn } from '../lib/cn';

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  'aria-label'?: string;
}

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  const active = checked || indeterminate;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      onChange();
    }
  }

  return (
    <div
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      className={cn(
        'grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded-sm border transition-colors',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-ink-muted/40 bg-transparent hover:border-accent/60'
      )}
      data-checkbox
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.stopPropagation();
        onChange();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      role="checkbox"
      tabIndex={0}
    >
      {checked && !indeterminate ? (
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 16 16"
        >
          <path d="M3 8.5l3.5 3.5 6.5-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {indeterminate ? (
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 16 16"
        >
          <path d="M3 8h10" strokeLinecap="round" />
        </svg>
      ) : null}
    </div>
  );
}
