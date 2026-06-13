import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocket } from './src/lib/socket/socket';
import { initWorker } from './src/lib/queue/worker';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  initSocket(server);

  // Initialize Background Workers (BullMQ)
  // Only initialize if REDIS is provided to prevent crashes
  if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
    try {
      initWorker();
      console.log('> Background Workers (BullMQ) initialized');
    } catch (e) {
      console.warn('> Failed to initialize BullMQ workers. Check Redis connection.', e);
    }
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.IO Server initialized on /ws');
  });
});
