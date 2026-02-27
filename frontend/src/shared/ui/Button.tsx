import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'default' | 'small';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = 'secondary', size = 'default', className = '', type = 'button', ...props }: Props) {
  const sizeClass = size === 'small' ? ' ui-button-small' : '';
  return <button type={type} className={`ui-button ui-button-${variant}${sizeClass} ${className}`.trim()} {...props} />;
}
