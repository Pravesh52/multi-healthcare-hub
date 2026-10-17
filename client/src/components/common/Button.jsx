import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Spinner } from './Loader.jsx';

const VARIANTS = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ok: 'btn-ok',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

export default function Button({
  variant = 'primary',
  size,
  loading = false,
  disabled = false,
  icon: Icon,
  to,
  href,
  type = 'button',
  block = false,
  className = '',
  children,
  ...rest
}) {
  const cls = clsx('btn', VARIANTS[variant], size === 'sm' && 'btn-sm', block && 'w-full', className);
  const iconSize = size === 'sm' ? 16 : 18;

  const inner = (
    <>
      {loading ? <Spinner size={iconSize} tone="current" /> : Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
      {children}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  if (href && !disabled) {
    return (
      <a href={href} className={cls} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {inner}
    </button>
  );
}