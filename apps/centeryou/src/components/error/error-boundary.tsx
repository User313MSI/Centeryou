'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen } from './error-screen';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Filet de sécurité React : si une vue plante pendant le rendu,
 * affiche l'écran d'erreur français au lieu d'une page blanche.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Centeryou — erreur interceptée :', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  private retry = () => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return <ErrorScreen onReload={this.reload} onRetry={this.retry} />;
    }
    return this.props.children;
  }
}
