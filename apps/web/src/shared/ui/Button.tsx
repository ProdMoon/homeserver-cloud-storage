import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'ghost' | 'danger' | 'nav';

export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-transparent px-4 py-3 text-sm font-medium no-underline transition duration-150 ease-out hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0',
  {
    variants: {
      variant: {
        primary:
          'text-stone-50 shadow-sm [background:linear-gradient(135deg,var(--color-accent),var(--color-accent-soft))]',
        ghost: 'bg-black/5 text-inherit hover:bg-black/8',
        danger: 'bg-danger-wash text-danger hover:bg-danger/20',
        nav: 'w-full justify-start bg-white/8 text-sidebar-text hover:bg-white/12',
      },
      active: {
        false: '',
        true: '',
      },
    },
    compoundVariants: [
      {
        active: true,
        variant: 'nav',
        className:
          'text-stone-50 [background:linear-gradient(135deg,rgba(219,109,48,0.88),rgba(238,147,66,0.78))]',
      },
    ],
    defaultVariants: {
      variant: 'ghost',
      active: false,
    },
  }
);

interface SharedButtonProps extends VariantProps<typeof buttonVariants> {
  className?: string;
}

type ButtonProps = SharedButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;
type LinkButtonProps = SharedButtonProps & AnchorHTMLAttributes<HTMLAnchorElement>;

export function Button({ variant = 'ghost', active = false, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant: variant as Variant, active }), className)}
      {...props}
    />
  );
}

export function LinkButton({
  variant = 'ghost',
  active = false,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <a
      className={cn(buttonVariants({ variant: variant as Variant, active }), className)}
      {...props}
    />
  );
}
