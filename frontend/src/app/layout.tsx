import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ala-Too Digital Signatures',
  description: 'Secure digital signatures platform for Ala-Too International University',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
