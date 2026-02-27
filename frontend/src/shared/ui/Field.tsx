import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Field({ label, children, className = '' }: Props) {
  return (
    <label className={`ui-field ${className}`.trim()}>
      <span className="ui-field-label">{label}</span>
      {children}
    </label>
  );
}
