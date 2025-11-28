// api/proxy.js – Savaged.us Proxy for OwlBear Rodeo
import { createProxyMiddleware } from 'http-proxy-middleware';

const allowedOrigins = [
  'https://www.owlbear.rodeo',
  'https://app.owlbear.rodeo',
  'http://localhost:5347', // for local dev
];

export default function handler(req, res) {
  // CORS setup for OwlBear
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Proxy to savaged.us
  const proxy = createProxyMiddleware({
    target: 'https://savaged.us',
    changeOrigin: true,
    pathRewrite: { '^/api/proxy': '' }, // Optional: Use /api/proxy prefix if needed
    onProxyReq: (proxyReq, req) => {
      // Forward all headers (including apikey in body)
      if (req.body) {
        proxyReq.write(req.body);
      }
    },
    onProxyRes: (proxyRes) => {
      // Clean up headers that break iframes/extensions
      delete proxyRes.headers['cross-origin-resource-policy'];
      delete proxyRes.headers['cross-origin-embedder-policy'];
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['x-frame-options'];
    },
  });

  return proxy(req, res, (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Proxy error' });
    }
  });
}

export const config = {
  api: { bodyParser: false }, // Important: Let proxy handle body
};