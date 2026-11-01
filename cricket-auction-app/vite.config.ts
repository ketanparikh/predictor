import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


import fs from 'fs';
import os from 'os';
import path from 'path';

function getActiveTunnelUrl(): string {
  try {
    const cacheFile = path.resolve(__dirname, '.auction-cache', 'tunnel-url.txt');
    if (fs.existsSync(cacheFile)) {
      const saved = fs.readFileSync(cacheFile, 'utf8').trim();
      if (saved && saved.startsWith('http')) return saved;
    }
  } catch {}
  try {
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\rehet';
    const logDir = path.resolve(userProfile, '.gemini/antigravity/brain');
    if (fs.existsSync(logDir)) {
      const convs = fs.readdirSync(logDir);
      convs.sort((a: string, b: string) => {
        try {
          return fs.statSync(path.join(logDir, b)).mtimeMs - fs.statSync(path.join(logDir, a)).mtimeMs;
        } catch { return 0; }
      });
      for (const conv of convs) {
        const tasksPath = path.join(logDir, conv, '.system_generated', 'tasks');
        if (fs.existsSync(tasksPath)) {
          const files = fs.readdirSync(tasksPath).filter((f: string) => f.endsWith('.log'));
          files.sort((a: string, b: string) => {
            const statA = fs.statSync(path.join(tasksPath, a));
            const statB = fs.statSync(path.join(tasksPath, b));
            return statB.mtimeMs - statA.mtimeMs;
          });
          for (const f of files) {
            const content = fs.readFileSync(path.join(tasksPath, f), 'utf8');
            const match = content.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
            if (match) {
              return match[0];
            }
          }
        }
      }
    }
  } catch {}
  return 'https://health-massive-mechanism-speed.trycloudflare.com';
}


function getLocalNetworkIp(): string {
  try {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {}
  return '10.24.68.105';
}

function auctionSyncPlugin(): Plugin {
  const cacheDir = path.resolve(__dirname, '.auction-cache');
  const stateFilePath = path.join(cacheDir, 'auction-server-state.json');
  const legacyFilePath = path.resolve(__dirname, '.auction-server-state.json');

  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {}
  }

  let globalAuctionState: any = null;
  try {
    if (fs.existsSync(stateFilePath)) {
      globalAuctionState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    } else if (fs.existsSync(legacyFilePath)) {
      globalAuctionState = JSON.parse(fs.readFileSync(legacyFilePath, 'utf8'));
      try {
        fs.writeFileSync(stateFilePath, JSON.stringify(globalAuctionState), 'utf8');
        fs.unlinkSync(legacyFilePath);
      } catch {}
    }
  } catch {}
  const sseClients = new Set<any>();

  return {
    name: 'auction-network-sync-plugin',
    configureServer(server: ViteDevServer) {
      // Periodic heartbeat every 15s to keep Cloudflare tunnel streams alive
      setInterval(() => {
        for (const client of sseClients) {
          try {
            client.write(': ping\n\n');
          } catch {
            sseClients.delete(client);
          }
        }
      }, 15000);

      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ? req.url.split('?')[0] : '';
        const url = rawUrl.replace(/^\/auction/, '') || '/';

        // CORS Headers for Wi-Fi devices & remote spectators
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // 0. GET active Cloudflare tunnel URL & Local Network IP
        if ((url === '/api/tunnel-url' || url === '/auction/api/tunnel-url') && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          const tunnelUrl = getActiveTunnelUrl();
          const localIp = getLocalNetworkIp();
          res.end(JSON.stringify({ success: true, tunnelUrl, localIp, port: 5173 }));
          return;
        }

        // 1. SSE Real-Time Stream Endpoint for instant spectator & projector push
        if (url === '/api/auction-stream') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          });

          sseClients.add(res);

          // If there is existing state, immediately push it to the new spectator
          if (globalAuctionState) {
            res.write(`data: ${JSON.stringify(globalAuctionState)}\n\n`);
          } else {
            res.write(': connected\n\n');
          }

          req.on('close', () => {
            sseClients.delete(res);
          });
          return;
        }

        // 2. GET current state (for polling & initial load)
        if (url === '/api/auction-state' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(globalAuctionState || null));
          return;
        }

        // 3. POST state (admin pushes latest state)
        if (url === '/api/auction-state' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              if (body) {
                globalAuctionState = JSON.parse(body);
                try {
                  fs.writeFileSync(stateFilePath, body, 'utf8');
                } catch {}

                // Push update to all connected spectator phones in real-time
                const sseMessage = `data: ${body}\n\n`;
                for (const client of sseClients) {
                  try {
                    client.write(sseMessage);
                  } catch {
                    sseClients.delete(client);
                  }
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
          });
          return;
        }

        // 4. POST /api/fetch-cricheroes (Server Proxy for CricHeroes & chshare.link)
        if (url === '/api/fetch-cricheroes' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { urlOrId } = JSON.parse(body || '{}');
              if (!urlOrId || typeof urlOrId !== 'string') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Please provide a valid CricHeroes profile link, chshare.link, or player ID' }));
                return;
              }

              let input = urlOrId.trim();

              // Extract first URL if input is wrapped in WhatsApp or share text
              const extractedUrlMatch = input.match(/https?:\/\/[^\s"'<>]+/i);
              if (extractedUrlMatch) {
                input = extractedUrlMatch[0];
              }

              let resolvedPlayerId: string | null = null;
              let targetUrl = input;

              // Handle chshare.link official mobile app share shortlinks (e.g. https://chshare.link/player/oSHh0e)
              if (input.includes('chshare.link')) {
                try {
                  const chShareRes = await fetch(input, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                    redirect: 'follow',
                  });

                  if (chShareRes.ok) {
                    const chShareHtml = await chShareRes.text();

                    // 1. Try Next.js __NEXT_DATA__ payload
                    const nextDataMatch = chShareHtml.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
                    if (nextDataMatch) {
                      try {
                        const parsedNext = JSON.parse(nextDataMatch[1]);
                        const destUrl = parsedNext?.props?.pageProps?.link_data?.url;
                        const matchId = destUrl?.match(/player-profile\/(\d+)/i);
                        if (matchId) {
                          resolvedPlayerId = matchId[1];
                        }
                      } catch {}
                    }

                    // 2. Direct regex in HTML if __NEXT_DATA__ parsing was insufficient
                    if (!resolvedPlayerId) {
                      const idInHtml = chShareHtml.match(/player-profile\/(\d+)/i) || chShareHtml.match(/"url":\s*"(?:https?:\\\/\\\/[^"]*cricheroes\.com\\\/player-profile\\\/(\d+))/i);
                      if (idInHtml) {
                        resolvedPlayerId = idInHtml[1];
                      }
                    }

                    // 3. Check if redirect changed final URL
                    if (!resolvedPlayerId && chShareRes.url && chShareRes.url.includes('player-profile')) {
                      const finalUrlId = chShareRes.url.match(/player-profile\/(\d+)/i);
                      if (finalUrlId) {
                        resolvedPlayerId = finalUrlId[1];
                      }
                    }
                  }
                } catch (chErr) {
                  console.warn('Error resolving chshare.link:', chErr);
                }
              }

              // Handle direct cricheroes player-profile link or raw numeric ID
              if (!resolvedPlayerId) {
                const idMatch = input.match(/(?:player-profile|cricketer)\/(\d+)/i) || input.match(/^(\d+)$/);
                if (idMatch) {
                  resolvedPlayerId = idMatch[1];
                }
              }

              // Construct the destination URL with the full RSC matches payload
              if (resolvedPlayerId) {
                targetUrl = `https://cricheroes.com/player-profile/${resolvedPlayerId}/player/matches`;
              } else if (!targetUrl.startsWith('http')) {
                targetUrl = `https://cricheroes.com/player-profile/${targetUrl}/player/matches`;
              }

              const response = await fetch(targetUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
                redirect: 'follow',
              });

              if (!response.ok) {
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: `CricHeroes responded with status ${response.status}. Please check the profile URL or ID.` }));
                return;
              }

              const html = await response.text();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, html, finalUrl: response.url, playerId: resolvedPlayerId }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || 'Failed to communicate with CricHeroes' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/auction/',
  build: {
    outDir: '../web/auction',
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss(), auctionSyncPlugin()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    watch: {
      ignored: [
        '**/.auction-cache/**',
        '**/.auction-server-state*.json',
        '**/*.exe',
        '**/*.log',
      ],
    },
  },
})


