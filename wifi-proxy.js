/**
 * WiFi Auth HTTP Proxy for Ruijie WifiDog
 *
 * Problem: Ruijie's WifiDog daemon only speaks HTTP (port 80).
 *          Vercel forces HTTPS. The daemon can't follow redirects.
 *
 * Solution: This proxy listens on HTTP and forwards all requests
 *           to portal.birrasport.com over HTTPS.
 *
 * Usage:
 *   1. Run on a machine in the stadium LAN: node wifi-proxy.js
 *   2. Note the machine's LAN IP (e.g., 10.10.10.50)
 *   3. In Ruijie Cloud config, set portal URL to: http://10.10.10.50/wifi/auth/wifidogAuth
 *   4. Test WiFi login
 *
 * Requires: Node.js 14+
 * Port: 80 (requires admin/root)
 *   Windows: run terminal as Administrator
 *   Linux/Mac: sudo node wifi-proxy.js
 */

const http = require('http');
const https = require('https');

const TARGET_HOST = 'portal.birrasport.com';
const PROXY_PORT = 80;

const server = http.createServer((req, res) => {
  const isAuth = req.url.includes('/wifidogAuth/auth');
  const method = req.method;
  const ts = new Date().toLocaleTimeString();

  if (isAuth) {
    console.log(`[${ts}] >>> GATEWAY AUTH CHECK: ${method} ${req.url}`);
  } else {
    console.log(`[${ts}] ${method} ${req.url}`);
  }

  // Collect request body (for POST requests)
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);

    const options = {
      hostname: TARGET_HOST,
      port: 443,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: TARGET_HOST, // Override host header to match Vercel
      },
    };

    // Remove headers that could cause issues
    delete options.headers['accept-encoding']; // Let us read the response as text

    const proxyReq = https.request(options, (proxyRes) => {
      // For redirects, rewrite Location header to point back through proxy
      const headers = { ...proxyRes.headers };
      if (headers.location) {
        headers.location = headers.location
          .replace(`https://${TARGET_HOST}`, '')
          .replace(`http://${TARGET_HOST}`, '');
      }

      if (isAuth) {
        // For auth checks, read the full response to log it
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          console.log(`[${ts}] <<< AUTH RESPONSE: "${data.trim()}" (status ${proxyRes.statusCode})`);
          res.writeHead(proxyRes.statusCode, headers);
          res.end(data);
        });
      } else {
        // For everything else, stream through
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
      }
    });

    proxyReq.on('error', (err) => {
      console.error(`[${ts}] ERROR: ${err.message}`);
      if (isAuth) {
        // Auth endpoint must always respond
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Auth: 0');
      } else {
        res.writeHead(502);
        res.end('Proxy Error');
      }
    });

    if (body.length > 0) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  // Get local IPs to show in the console
  const nets = require('os').networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(`${net.address} (${name})`);
      }
    }
  }

  console.log('');
  console.log('===========================================');
  console.log('  WiFi Auth HTTP Proxy - BirraSport');
  console.log('===========================================');
  console.log(`  Listening on port ${PROXY_PORT} (HTTP)`);
  console.log(`  Forwarding to: https://${TARGET_HOST}`);
  console.log('');
  console.log('  Local IPs:');
  ips.forEach(ip => console.log(`    ${ip}`));
  console.log('');
  console.log('  In Ruijie Cloud, set portal URL to:');
  ips.forEach(ip => console.log(`    http://${ip.split(' ')[0]}/wifi/auth/wifidogAuth`));
  console.log('');
  console.log('  Waiting for requests...');
  console.log('===========================================');
  console.log('');
});
