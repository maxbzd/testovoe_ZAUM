import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

export function Topbar({ title, subtitle, children }: Props) {
  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__title">{title}</h1>
        <p className="topbar__sub">{subtitle}</p>
      </div>
      {children && <div className="topbar__actions">{children}</div>}
    </header>
  );
}
