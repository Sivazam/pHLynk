// server.ts - Next.js Standalone + Socket.IO
import { setupSocket } from '@/lib/socket';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { parse } from 'url';
import { join } from 'path';

const dev = process.env.NODE_ENV !== 'production';
const currentPort = process.env.PORT || 3000;
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
    const server = createServer((req, res) => {
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

      // Set proper headers for all responses
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Parse the URL
      const parsedUrl = parse(req.url!, true);
      const { pathname } = parsedUrl;

      // Handle static assets from .next directory
      if (pathname?.startsWith('/_next/static/')) {
        // Let Next.js handle static assets
        return handle(req, res);
      }

      // Handle other static files
      if (pathname?.includes('.')) {
        // Let Next.js handle other static files
        return handle(req, res);
      }

      // Let Next.js handle everything else including API routes and pages
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
