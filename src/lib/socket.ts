import { Server } from 'socket.io';
import { logger } from '@/lib/logger';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id }, { context: 'Socket.IO' });
    
    // Handle messages
    socket.on('message', (msg: { text: string; senderId: string }) => {
      // Echo: broadcast message only the client who send the message
      socket.emit('message', {
        text: `Echo: ${msg.text}`,
        senderId: 'system',
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info('Client disconnected', { socketId: socket.id }, { context: 'Socket.IO' });
    });

    // Send welcome message
    socket.emit('message', {
      text: 'Welcome to WebSocket Echo Server!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });
};