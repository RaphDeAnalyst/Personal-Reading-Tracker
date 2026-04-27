import type { LucideIcon } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type IconVariant =
  | 'default'
  | 'muted'
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'inverted'
  | 'inherit';

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  variant?: IconVariant;
  className?: string;
  strokeWidth?: number;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

export default function Icon({
  icon: IconComponent,
  size = 'md',
  variant = 'inherit',
  className,
  strokeWidth = 1.5,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHiddenProp,
}: IconProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const variantClasses = {
    default: 'text-on-surface',
    muted: 'text-on-surface-variant',
    primary: 'text-primary',
    success: 'text-tertiary',
    danger: 'text-error',
    warning: 'text-tertiary',
    inverted: 'text-on-primary',
    inherit: '',
  };

  const sizeClass = sizeClasses[size];
  const variantClass = variantClasses[variant];
  const isDecorative = !ariaLabel;
  const ariaHidden = ariaHiddenProp ?? isDecorative;

  return (
    <IconComponent
      className={[sizeClass, variantClass, className].filter(Boolean).join(' ')}
      strokeWidth={strokeWidth}
      aria-hidden={ariaHidden ? true : undefined}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    />
  );
}
