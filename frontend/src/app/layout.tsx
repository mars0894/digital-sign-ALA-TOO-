import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ala-Too Digital Signatures',
  description: 'Secure digital signatures platform for Ala-Too International University',
};

import { LanguageProvider } from '@/lib/i18n';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
