import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="google-site-verification" content="0cyCWEMy_FexMpfBARoI48z4Bddzzy6dkRsg0blmWD8" />
        <meta name="theme-color" content="#000000" />

        <title>SIVES</title>

        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/iconos/escudo-dim2.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/iconos/escudo-dim.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SIVES" />

        <ScrollViewStyleReset />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root {
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #F6F8FB;
            }
            input, textarea, select, button {
              font-family: inherit;
            }
          `,
        }} />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none',
                  }).then(function(registration) {
                    registration.update().catch(function(error) {
                      console.log('No se pudo forzar update del Service Worker:', error);
                    });
                    console.log('Service Worker registrado con Ã©xito:', registration.scope);
                  }, function(err) {
                    console.log('Fallo al registrar Service Worker:', err);
                  });
                });
              }
            `,
          }}
        />  
      </body>
    </html>
  );
}

