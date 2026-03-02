import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'SaldoBirras — BirraSport',
  description: 'Sistema de gestión de saldos para cervecería',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SaldoBirras',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#060A13',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) {
                  reg.addEventListener('updatefound', function() {
                    var w = reg.installing;
                    if (w) w.addEventListener('statechange', function() {
                      if (w.state === 'activated' && navigator.serviceWorker.controller) {
                        console.log('[SW] Nueva versión disponible');
                      }
                    });
                  });
                })
                .catch(function(err) { console.warn('[SW] Error registro:', err); });
            });
          }
        `}} />
      </body>
    </html>
  );
}
