import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'BirraSport - Pedidos',
  description: 'Haz tu pedido desde tu teléfono',
  manifest: '/manifest-portal.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BirraSport',
  },
};

export const viewport: Viewport = {
  themeColor: '#D49B28',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
