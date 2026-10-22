import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import path from 'node:path';
import { defineConfig, loadEnv, Plugin } from 'vite';

function healthCheckPlugin(): Plugin {
  let sharedLanState: any = {};

  const healthHandler = (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.end(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        school: 'Colégio Estadual Olynto Pereira de Castro',
        environment: process.env.NODE_ENV || 'development',
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      })
    );
  };

  const syncHandler = (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          sharedLanState = { ...sharedLanState, ...parsed, _lastSync: new Date().toISOString() };
          res.end(JSON.stringify({ success: true, timestamp: sharedLanState._lastSync }));
        } catch (e: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // GET
    res.end(JSON.stringify({ success: true, data: sharedLanState }));
  };

  const aiHandler = (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const url = req.url || '';

        if (url.includes('/sintese-apoio')) {
          res.end(JSON.stringify({
            success: true,
            message: 'Síntese pedagógica processada com sucesso.',
          }));
          return;
        }

        if (url.includes('/gerar-atividade')) {
          res.end(JSON.stringify({
            success: true,
            message: 'Atividade gerada com base na Matriz Curricular homologada.',
          }));
          return;
        }

        res.end(JSON.stringify({ success: true, payload }));
      } catch (e: any) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
  };

  return {
    name: 'api-school-sync-middleware',
    configureServer(server) {
      server.middlewares.use('/api/health', healthHandler);
      server.middlewares.use('/api/sync-state', syncHandler);
      server.middlewares.use('/api/ai', aiHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/health', healthHandler);
      server.middlewares.use('/api/sync-state', syncHandler);
      server.middlewares.use('/api/ai', aiHandler);
    },
  };
}

function normalizeHost(input?: string): string {
  if (!input) return '';
  let str = input.trim();
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      return new URL(str).hostname;
    } catch {
      str = str.replace(/^https?:\/\//, '');
    }
  }
  // Strip port if present
  str = str.split(':')[0];
  // Strip path or trailing slash if present
  str = str.split('/')[0];
  return str.trim();
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const internalPort = 3000;

  const rawPublicHost =
    env.APP_URL ||
    process.env.APP_URL ||
    env.VITE_PUBLIC_HOST ||
    '';
  const extractedHost = normalizeHost(rawPublicHost);
  const isLocal =
    !extractedHost ||
    extractedHost === 'localhost' ||
    extractedHost === '127.0.0.1' ||
    extractedHost === '::1';
  const publicHost = isLocal ? '' : extractedHost;

  const publicProtocol = publicHost ? 'wss' : 'ws';
  const publicClientPort = publicHost ? 443 : internalPort;

  // Diretório de saída absoluto e explicitamente resolvido para garantir que
  // vite-plugin-compression e o build do Vite gerem os arquivos .gz em dist/assets/
  // evitando qualquer erro de concatenação como 'dist//app/applet/assets/'
  const outDir = path.resolve(import.meta.dirname, 'dist');

  return {
    plugins: [
      react(),
      tailwindcss(),
      healthCheckPlugin(),
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // Comprime arquivos maiores que 10KB
        deleteOriginFile: false,
        ...({ outDir }),
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      target: 'esnext',
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-firebase-firestore',
                test: /[\\/]node_modules[\\/](@firebase[\\/]firestore|firebase[\\/]firestore)[\\/]/,
                priority: 35,
              },
              {
                name: 'vendor-firebase-auth',
                test: /[\\/]node_modules[\\/](@firebase[\\/]auth|firebase[\\/]auth)[\\/]/,
                priority: 34,
              },
              {
                name: 'vendor-firebase-core',
                test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
                priority: 30,
              },
              {
                name: 'vendor-pdf',
                test: /[\\/]node_modules[\\/](jspdf|html2canvas|canvg|fflate)[\\/]/,
                priority: 30,
              },
              {
                name: 'vendor-dashboard',
                test: /[\\/]node_modules[\\/](recharts|d3-|victory)[\\/]/,
                priority: 30,
              },
              {
                name: 'vendor-react',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 25,
              },
              {
                name: 'vendor-icons',
                test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
                priority: 25,
              },
              {
                name: 'vendor-motion',
                test: /[\\/]node_modules[\\/](motion|framer-motion)[\\/]/,
                priority: 20,
              },
              {
                name: 'vendor-genai',
                test: /[\\/]node_modules[\\/]@google[\\/]genai[\\/]/,
                priority: 20,
              },
              {
                name: 'chunk-dashboard',
                test: /[\\/]components[\\/]coordenacao[\\/](DashboardView|CoordenacaoDashboardCharts|GraficoHistoricoBimestre)/,
                priority: 15,
              },
              {
                name: 'chunk-editor-a4',
                test: /[\\/]components[\\/]a4[\\/]/,
                priority: 15,
              },
              {
                name: 'chunk-relatorios-pei',
                test: /[\\/](components[\\/]pei|services[\\/](pei|relatorio|auditExport))[\\/]/,
                priority: 15,
              },
            ],
          },
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) {
                return 'vendor-firebase-firestore';
              }
              if (id.includes('@firebase/auth') || id.includes('firebase/auth')) {
                return 'vendor-firebase-auth';
              }
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'vendor-firebase-core';
              }
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg')) {
                return 'vendor-pdf';
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-dashboard';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-genai';
              }
              if (id.includes('qrcode')) {
                return 'vendor-qrcode';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              return 'vendor-libs';
            }

            // Route & Feature Code Splitting
            if (id.includes('/components/a4/')) {
              return 'chunk-editor-a4';
            }
            if (id.includes('/components/coordenacao/DashboardView') || id.includes('/components/coordenacao/CoordenacaoDashboardCharts') || id.includes('/components/coordenacao/GraficoHistoricoBimestre')) {
              return 'chunk-dashboard';
            }
            if (id.includes('/components/pei/') || id.includes('/services/pei') || id.includes('/services/relatorio')) {
              return 'chunk-relatorios-pei';
            }
            if (id.includes('/components/master/')) {
              return 'chunk-administracao-master';
            }
            if (id.includes('/components/coordenacao/')) {
              return 'chunk-administracao-coordenacao';
            }
            if (id.includes('/components/professor/')) {
              return 'chunk-atividades-professor';
            }
            if (id.includes('/components/apoio/')) {
              return 'chunk-atividades-apoio';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      allowedHosts: true,
      hmr: {
        overlay: true,
      },
      ...(publicHost
        ? {
            ws: {
              protocol: publicProtocol,
              host: publicHost,
              clientPort: publicClientPort,
            },
          }
        : {}),
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**'],
      },
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
