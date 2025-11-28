// api/proxy.js
import { createProxyMiddleware } from 'http-proxy-middleware';

const proxy = createProxyMiddleware({
  target: 'https://savaged.us',
  changeOrigin: true,
  pathRewrite: { '^/api/proxy': '' }, // → /_api/auth/…
  onProxyRes: (proxyRes) => {
    // Remove headers that break browser extensions
    delete proxyRes.headers['cross-origin-resource-policy'];
    delete proxyRes.headers['cross-origin-embedder-policy'];
    delete proxyRes.headers['content-security-policy'];
  },
});

export default function handler(req, res) {
  // Only allow OwlBear Rodeo origins (security!)
  const origin = req.headers.origin;
  const allowed = [
    'https://www.owlbear.rodeo',
    'https://app.owlbear.rodeo',
    'http://localhost:5347', // local dev
  ];
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  return proxy(req, res);
}

export const config = { api: { bodyParser: false } };