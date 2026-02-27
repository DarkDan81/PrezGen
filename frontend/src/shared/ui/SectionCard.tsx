import type { ReactNode } from 'react';

type Props = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, children, className = '' }: Props) {
  return (
    <section className={`ui-section-card ${className}`.trim()}>
      {title ? <h4 className="ui-section-card-title">{title}</h4> : null}
      {children}
    </section>
  );
}
