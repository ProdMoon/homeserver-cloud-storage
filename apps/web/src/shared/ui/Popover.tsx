import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
}

export function Popover({ trigger, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom - 4;
    const fitsBelow = spaceBelow >= dropdownHeight;

    setPosition({
      top: fitsBelow ? triggerRect.bottom + 4 : triggerRect.top - dropdownHeight - 4,
      left: triggerRect.right,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, updatePosition]);

  return (
    <div ref={triggerRef}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        {trigger}
      </div>
      {open
        ? createPortal(
            <div
              className="fixed z-50 min-w-44 rounded-xl border border-line bg-surface-panel py-1 shadow-cloud"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              ref={dropdownRef}
              style={{ top: position.top, left: position.left, transform: 'translateX(-100%)' }}
            >
              {children}
            </div>,
            document.body
          )
        : null}
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
