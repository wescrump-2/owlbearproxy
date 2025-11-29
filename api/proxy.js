// api/proxy.js – Savaged.us Proxy for OwlBear Rodeo
import { createProxyMiddleware } from 'http-proxy-middleware';

const allowedOrigins = [
  'https://www.owlbear.rodeo',
  'https://app.owlbear.rodeo',
  'http://localhost:5347', // for local dev
];

export default function handler(req, res) {
  console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`);
  // CORS setup for OwlBear
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log(`[${new Date().toISOString()}] Handling OPTIONS request`);
    res.status(200).end();
    return;
  }

  console.log(`[${new Date().toISOString()}] Starting proxy to savaged.us`);
  // Proxy to savaged.us
  const proxy = createProxyMiddleware({
    target: 'https://savaged.us',
    changeOrigin: true,
    timeout: 55000, // Set timeout to 55s to allow buffer before Vercel's 60s
    pathRewrite: { '^/api/proxy': '' }, // Optional: Use /api/proxy prefix if needed
    onProxyReq: (proxyReq, req) => {
      console.log(`[${new Date().toISOString()}] Proxy request initiated`);
      // Forward all headers (including apikey in body)
      if (req.body) {
        proxyReq.write(req.body);
      }
    },
    onProxyRes: (proxyRes) => {
      console.log(`[${new Date().toISOString()}] Proxy response received: ${proxyRes.statusCode}`);
      // Clean up headers that break iframes/extensions
      delete proxyRes.headers['cross-origin-resource-policy'];
      delete proxyRes.headers['cross-origin-embedder-policy'];
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['x-frame-options'];
    },
    onError: (err, req, res) => {
      console.error(`[${new Date().toISOString()}] Proxy error:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Proxy error' });
      }
    },
  });

  return proxy(req, res);
}

export const config = {
  api: { bodyParser: false }, // Important: Let proxy handle body
};