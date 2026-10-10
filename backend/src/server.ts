import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.port, '127.0.0.1', () => {
  console.log(`SpaceShare API: http://127.0.0.1:${env.port}`);
});

server.on('error', (error) => {
  console.error(`Serverul nu poate porni: ${error.message}`);
  process.exitCode = 1;
});

function shutdown() {
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
  server.closeIdleConnections();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
