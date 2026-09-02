import type { Metadata } from 'next';
import './globals.css';

import { AuthProvider } from '@/context/auth-context';

export const metadata: Metadata = {
  title: 'iPermit Admin',
  description: 'iPermit licensing department admin dashboard',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
