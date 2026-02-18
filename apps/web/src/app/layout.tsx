import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'IPET Dashboard',
  description: 'Pet Shop Management Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
