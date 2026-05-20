import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'WebGame — Rebuild',
  description: 'Persistent async MMO. Rebuild your town. Survive the world.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ash text-bone min-h-screen font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
