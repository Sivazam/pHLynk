// server.ts - Next.js Standalone + Socket.IO
import { setupSocket } from '@/lib/socket';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { parse } from 'url';
import path from 'path';
import fs from 'fs';

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

      // Handle static files with proper MIME types
      const parsedUrl = parse(req.url!, true);
      const pathname = parsedUrl.pathname;

      // Handle CSS files specifically to ensure correct MIME type
      if (pathname?.endsWith('.css')) {
        try {
          const staticPath = path.join(process.cwd(), '.next', 'static', pathname.replace('/_next/static/', ''));
          
          if (fs.existsSync(staticPath)) {
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            const fileStream = fs.createReadStream(staticPath);
            fileStream.pipe(res);
            return;
          }
        } catch (error) {
          console.error('Error serving CSS file:', error);
        }
      }

      // Handle JS files
      if (pathname?.endsWith('.js')) {
        try {
          const staticPath = path.join(process.cwd(), '.next', 'static', pathname.replace('/_next/static/', ''));
          
          if (fs.existsSync(staticPath)) {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            const fileStream = fs.createReadStream(staticPath);
            fileStream.pipe(res);
            return;
          }
        } catch (error) {
          console.error('Error serving JS file:', error);
        }
      }

      // Handle other static assets
      if (pathname?.startsWith('/_next/static/')) {
        try {
          const staticPath = path.join(process.cwd(), '.next', 'static', pathname.replace('/_next/static/', ''));
          
          if (fs.existsSync(staticPath)) {
            // Determine MIME type based on file extension
            const ext = path.extname(staticPath);
            const mimeTypes: { [key: string]: string } = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
              '.woff': 'font/woff',
              '.woff2': 'font/woff2',
              '.ttf': 'font/ttf',
              '.eot': 'application/vnd.ms-fontobject',
              '.json': 'application/json',
              '.txt': 'text/plain',
              '.xml': 'application/xml'
            };
            
            if (mimeTypes[ext]) {
              res.setHeader('Content-Type', mimeTypes[ext]);
            }
            
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            const fileStream = fs.createReadStream(staticPath);
            fileStream.pipe(res);
            return;
          }
        } catch (error) {
          console.error('Error serving static file:', error);
        }
      }

      // Handle public folder files
      if (pathname?.startsWith('/') && !pathname?.startsWith('/api') && !pathname?.startsWith('/_next')) {
        try {
          const publicPath = path.join(process.cwd(), 'public', pathname === '/' ? 'index.html' : pathname);
          
          if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
            const ext = path.extname(publicPath);
            const mimeTypes: { [key: string]: string } = {
              '.html': 'text/html',
              '.css': 'text/css',
              '.js': 'application/javascript',
              '.json': 'application/json',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
              '.woff': 'font/woff',
              '.woff2': 'font/woff2',
              '.ttf': 'font/ttf',
              '.webmanifest': 'application/manifest+json'
            };
            
            if (mimeTypes[ext]) {
              res.setHeader('Content-Type', mimeTypes[ext]);
            }
            
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            const fileStream = fs.createReadStream(publicPath);
            fileStream.pipe(res);
            return;
          }
        } catch (error) {
          console.error('Error serving public file:', error);
        }
      }

      // Fall back to Next.js handler for everything else
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
