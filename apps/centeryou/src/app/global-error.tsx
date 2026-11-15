'use client';

import { ErrorScreen } from '../components/error/error-screen';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body>
        <ErrorScreen onReload={() => window.location.reload()} onRetry={reset} />
      </body>
    </html>
  );
}
