// api/proxy.js – Savaged.us Proxy for OwlBear Rodeo
import { createProxyMiddleware } from 'http-proxy-middleware';

const allowedOrigins = [
  'https://www.owlbear.rodeo',
  'https://app.owlbear.rodeo',
  'https://localhost:5173', // for local dev
];

export default async function handler(req, res) {
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

  if (req.url === '/url/proxy' && req.method === 'POST') {
    // Handle URL proxy
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    await new Promise(resolve => req.on('end', resolve));
    const bodyStr = Buffer.concat(chunks).toString();
    let body;
    try {
      body = JSON.parse(bodyStr);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON in request body' });
      return;
    }
    const { url } = body;
    if (!url) {
      res.status(400).json({ error: 'URL is required in request body' });
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        res.status(response.status).json({ error: `Failed to fetch URL: ${response.statusText}` });
        return;
      }
      const html = await response.text();
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } catch (e) {
      res.status(500).json({ error: 'Error fetching URL', message: e.message });
    }
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
        if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
          res.status(504).json({ error: 'Gateway Timeout', message: 'The target API took too long to respond.' });
        } else {
          res.status(500).json({ error: 'Proxy error', message: err.message });
        }
      }
    },
  });

  return proxy(req, res);
}

export const config = {
  api: { bodyParser: false }, // Important: Let proxy handle body
};