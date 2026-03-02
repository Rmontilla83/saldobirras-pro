import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Producción — BirraSport',
  description: 'Pantalla de producción en tiempo real',
};

export const viewport: Viewport = {
  themeColor: '#080D19',
  width: 'device-width',
  initialScale: 1,
};

export default function ProduccionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
