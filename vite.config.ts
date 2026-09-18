import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    esbuild: {
      // Automatically strip debugger and debug/info console.logs in production builds
      drop: isProd ? ['debugger'] : [],
      pure: isProd ? ['console.log', 'console.debug'] : [],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/devtunnel-proxy': {
          target: process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || 'https://h9xxcp2w-8000.inc1.devtunnels.ms',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/devtunnel-proxy/, ''),
          secure: false,
          timeout: 120000,
          proxyTimeout: 120000,
          headers: {
            'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
          },
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('[devtunnel-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes) => {
              delete proxyRes.headers['access-control-allow-origin'];
              delete proxyRes.headers['access-control-allow-credentials'];
            });
          },
        },
      },
    },
  };
});
