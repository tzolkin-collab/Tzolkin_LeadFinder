import './globals.css';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { TzolkinFloatingWidget } from '../components/brand/TzolkinLogo.js';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Tzolkin Tracer — Inteligência Comercial B2B',
  description: 'Plataforma de prospecção outbound de alto padrão. Garimpo de PMEs sem website, enriquecimento de dados públicos, cruzamento de sócios e apoio ao Last Mile via WhatsApp.',
  keywords: ['software house', 'tracer', 'prospecção', 'tzolkin', 'vendas b2b', 'inteligência comercial'],
  icons: {
    icon: [
      { url: '/icon.svg?v=4', type: 'image/svg+xml' },
      { url: '/favicon.svg?v=4', type: 'image/svg+xml' },
      { url: '/favicon-static.svg?v=4', type: 'image/svg+xml' },
    ],
    shortcut: ['/icon.svg?v=4'],
    apple: ['/favicon-static.svg?v=4'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        {children}
        <TzolkinFloatingWidget />
        <Script
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                  if (isSafari) {
                    var link = document.querySelector('link[rel="icon"][href*="favicon.svg"]');
                    if (link) link.href = '/favicon-static.svg';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
