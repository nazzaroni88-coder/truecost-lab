import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
  className?: string;
  children?: ReactNode;
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined; href?: undefined };
type LinkProps = BaseProps & { to: string; href?: undefined; title?: string; 'aria-label'?: string };
type AnchorProps = BaseProps & { href: string; to?: undefined; target?: string; rel?: string; title?: string; 'aria-label'?: string };

function cls({ variant = 'secondary', size = 'md', block, className }: BaseProps): string {
  return ['btn', variant !== 'secondary' && `btn-${variant}`, size !== 'md' && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, icon, iconRight, block, className, children, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={cls({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
});

export function LinkButton({ variant, size, icon, iconRight, block, className, children, to, ...rest }: LinkProps) {
  return (
    <Link to={to} className={cls({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

export function AnchorButton({ variant, size, icon, iconRight, block, className, children, href, ...rest }: AnchorProps) {
  return (
    <a href={href} className={cls({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
      {iconRight}
    </a>
  );
}

export function IconButton({ label, className, ...rest }: ButtonProps & { label: string }) {
  return <Button aria-label={label} title={label} className={`btn-icon ${className ?? ''}`} {...rest} />;
}
