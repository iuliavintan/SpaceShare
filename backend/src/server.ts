import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/client.js';
import { startBookingReminderWorker } from './modules/notifications/booking-reminders.js';

// Fail early if the database has not been migrated or cannot be opened.
await prisma.user.count();

const stopBookingReminderWorker = startBookingReminderWorker(prisma, (error) => {
  console.error('Verificarea reminderelor pentru rezervări a eșuat:', error);
});
const server = createApp().listen(env.port, '127.0.0.1', () => {
  console.log(`SpaceShare API: http://127.0.0.1:${env.port}`);
});

server.on('error', async (error) => {
  console.error(`Serverul nu poate porni: ${error.message}`);
  process.exitCode = 1;
  await prisma.$disconnect();
});

function shutdown() {
  stopBookingReminderWorker();
  server.close(async (error) => {
    await prisma.$disconnect();
    process.exitCode = error ? 1 : 0;
  });
  server.closeIdleConnections();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
