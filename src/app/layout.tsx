import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'SaldoBirras — BirraSport',
  description: 'Sistema de gestión de saldos para cervecería',
  manifest: '/manifest.json',
  themeColor: '#080D19',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
