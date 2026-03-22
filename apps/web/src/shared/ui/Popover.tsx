import { MouseEventHandler, type ReactNode, useEffect, useRef, useState } from 'react';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
}

export function Popover({ trigger, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        {trigger}
      </div>
      {open ? (
        <div
          className="absolute top-full right-0 z-20 mt-1 min-w-44 rounded-xl border border-line bg-surface-panel py-1 shadow-cloud"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

interface PopoverItemProps {
  icon?: ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
}

export function PopoverItem({ icon, label, danger, onClick, href }: PopoverItemProps) {
  const className = `flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-black/5 ${
    danger ? 'text-danger' : 'text-ink'
  }`;

  if (href) {
    return (
      <a className={className} href={href} onClick={onClick}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button className={className} onClick={onClick} type="button">
      {icon}
      {label}
    </button>
  );
}
