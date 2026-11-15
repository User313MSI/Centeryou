'use client';

import { ErrorScreen } from '../components/error/error-screen';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorScreen
      onReload={() => window.location.reload()}
      onRetry={reset}
    />
  );
}
