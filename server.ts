// server.ts - Next.js Standalone + Socket.IO
import { setupSocket } from '@/lib/socket';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { parse } from 'url';
import next from 'next';
import fs from 'fs';
import path from 'path';

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
      const parsedUrl = parse(req.url!, true);
      
      // Skip socket.io requests from Next.js handler
      if (parsedUrl.pathname?.startsWith('/api/socketio')) {
        return;
      }

      // Handle static assets directly (for both dev and production in preview environment)
      if (parsedUrl.pathname?.startsWith('/_next/static/')) {
        try {
          // Remove the _next/static prefix to get the relative path
          const relativePath = parsedUrl.pathname.replace('/_next/static/', '');
          
          // Try different possible locations for the static files
          const possiblePaths = [
            // Standard location (works for both dev and prod)
            path.join(process.cwd(), '.next', 'static', relativePath),
            // Development subdirectory (for some dev files)
            path.join(process.cwd(), '.next', 'static', 'development', relativePath),
            // Webpack development files
            path.join(process.cwd(), '.next', 'static', 'webpack', relativePath)
          ];
          
          for (const staticPath of possiblePaths) {
            if (fs.existsSync(staticPath)) {
              const stat = fs.statSync(staticPath);
              
              // Set appropriate content type
              if (staticPath.endsWith('.css')) {
                res.setHeader('Content-Type', 'text/css');
              } else if (staticPath.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
              } else if (staticPath.endsWith('.json')) {
                res.setHeader('Content-Type', 'application/json');
              } else if (staticPath.endsWith('.png')) {
                res.setHeader('Content-Type', 'image/png');
              } else if (staticPath.endsWith('.jpg') || staticPath.endsWith('.jpeg')) {
                res.setHeader('Content-Type', 'image/jpeg');
              } else if (staticPath.endsWith('.svg')) {
                res.setHeader('Content-Type', 'image/svg+xml');
              } else if (staticPath.endsWith('.ico')) {
                res.setHeader('Content-Type', 'image/x-icon');
              } else if (staticPath.endsWith('.woff2')) {
                res.setHeader('Content-Type', 'font/woff2');
              } else if (staticPath.endsWith('.woff')) {
                res.setHeader('Content-Type', 'font/woff');
              }
              
              // Set cache headers for static assets
              if (dev) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              } else {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
              }
              res.setHeader('ETag', `"${stat.mtime.getTime()}"`);
              
              // Handle if-none-match
              if (req.headers['if-none-match'] === `"${stat.mtime.getTime()}"`) {
                res.statusCode = 304;
                res.end();
                return;
              }
              
              const stream = fs.createReadStream(staticPath);
              stream.pipe(res);
              return;
            }
          }
          
          // If we get here, the file wasn't found in any location
          // Let Next.js handle the 404
          
        } catch (error) {
          console.error('Error serving static file:', error);
        }
      }

      // Handle all other requests with Next.js
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
