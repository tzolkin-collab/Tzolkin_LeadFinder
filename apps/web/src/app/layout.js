import './globals.css';
import { TzolkinFloatingWidget } from '../components/brand/TzolkinLogo.js';

export const metadata = {
  title: 'Lead Finder — Prospecção de Clientes',
  description: 'Encontre empresas sem website e transforme-as em clientes. Pesquisa via Google Places, análise com IA e relatórios completos.',
  keywords: ['lead generation', 'prospecção', 'clientes', 'landing page', 'negócios'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <TzolkinFloatingWidget />
      </body>
    </html>
  );
}
