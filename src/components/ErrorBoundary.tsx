import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Последняя линия обороны: упавший компонент не должен оставлять белый экран. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Сбой интерфейса:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="fatal" role="alert">
        <h1>Что-то пошло не так</h1>
        <p>Данные не пострадали. Обновите страницу, и всё вернётся на место.</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </main>
    );
  }
}
