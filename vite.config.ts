import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  // Primary backend URL: priority to explicit Render URL over local container variable
  const rawEnvUrl = process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || '';
  const targetBackend =
    rawEnvUrl && !rawEnvUrl.includes('127.0.0.1') && !rawEnvUrl.includes('localhost:8000')
      ? rawEnvUrl
      : 'https://irctc-backend-1-ge8x.onrender.com';
  const ntesBackend = 'https://railway-ntes-402829987485.asia-south1.run.app';

  const setCorsResponseHeaders = (proxyRes: any, req: any) => {
    const origin = req.headers?.origin;
    if (origin && origin !== 'null') {
      proxyRes.headers['access-control-allow-origin'] = origin;
      proxyRes.headers['access-control-allow-credentials'] = 'true';
    } else {
      delete proxyRes.headers['access-control-allow-credentials'];
      proxyRes.headers['access-control-allow-origin'] = '*';
    }
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, HEAD';
    proxyRes.headers['access-control-allow-headers'] =
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Tunnel-Skip-Anti-Abuse-Page, X-Warmup-Ping';
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(targetBackend),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(targetBackend),
    },
    esbuild: {
      // Automatically strip debugger and debug/info console.logs in production builds
      drop: isProd ? ['debugger'] : [],
      pure: isProd ? ['console.log', 'console.debug'] : [],
    },
    server: {
      cors: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/trains/route': {
          target: ntesBackend,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/trains\/route/, '/train/route'),
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          headers: {
            'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
          },
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('[api-trains-route-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
        '/api/trains/running-status': {
          target: ntesBackend,
          changeOrigin: true,
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          headers: {
            'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
          },
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('[api-trains-running-status-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
        '/train/route': {
          target: ntesBackend,
          changeOrigin: true,
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          headers: {
            'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
          },
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('[train-route-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
        '/trains': {
          target: ntesBackend,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/trains/, '/train'),
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          headers: {
            'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
          },
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('[trains-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
        '/api': {
          target: targetBackend,
          changeOrigin: true,
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          headers: {
            'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
            proxy.on('error', (err, _req, res) => {
              console.warn('[api-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
        '/chart': {
          target: targetBackend,
          changeOrigin: true,
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
            proxy.on('error', (err, _req, res) => {
              console.warn('[chart-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
        '/train': {
          target: targetBackend,
          changeOrigin: true,
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
            proxy.on('error', (err, _req, res) => {
              console.warn('[train-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
        '/health': {
          target: targetBackend,
          changeOrigin: true,
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
        '/devtunnel-proxy': {
          target: targetBackend,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/devtunnel-proxy/, ''),
          secure: false,
          timeout: 45000,
          proxyTimeout: 45000,
          headers: {
            'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
            proxy.on('error', (err, _req, res) => {
              console.warn('[devtunnel-proxy-error]', err?.message || err);
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proxy gateway error' }));
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              setCorsResponseHeaders(proxyRes, req);
            });
          },
        },
      },
    },
  };
});
