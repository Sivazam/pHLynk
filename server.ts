// server.ts - Next.js Standalone + Socket.IO
import { setupSocket } from '@/lib/socket';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { parse } from 'url';
import { join } from 'path';
import { readFile } from 'fs/promises';

const dev = process.env.NODE_ENV !== 'production';
const currentPort = 3000;
const hostname = '0.0.0.0';

// Custom server with Socket.IO integration
async function createCustomServer() {
  try {
    // Create Next.js app
    const nextApp = next({ 
      dev,
      dir: process.cwd(),
      // In production, use the current directory where .next is located
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createServer(async (req, res) => {
      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
        res.writeHead(200);
        res.end();
        return;
      }

      // Skip socket.io requests from Next.js handler
      if (req.url?.startsWith('/api/socketio')) {
        return;
      }

      // Handle static files with proper MIME types
      if (req.url?.startsWith('/_next/static/')) {
        try {
          const staticPath = join(process.cwd(), '.next', req.url);
          const fileContent = await readFile(staticPath);
          
          // Set appropriate MIME type based on file extension
          if (req.url.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (req.url.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (req.url.endsWith('.woff')) {
            res.setHeader('Content-Type', 'font/woff');
          } else if (req.url.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
          } else if (req.url.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          } else if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
          } else if (req.url.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          }
          
          // Set caching headers for static files
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          res.writeHead(200);
          res.end(fileContent);
          return;
        } catch (error) {
          // If file not found, let Next.js handle it
        }
      }

      // Set proper headers for all responses
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Let Next.js handle everything else including static files
      handle(req, res);
    });

    // Setup Socket.IO
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    setupSocket(io);

    // Start the server
    server.listen(currentPort, hostname, () => {
      console.log(`> Ready on http://${hostname}:${currentPort}`);
      console.log(`> Socket.IO server running at ws://${hostname}:${currentPort}/api/socketio`);
    });

  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Start the server
createCustomServer();
