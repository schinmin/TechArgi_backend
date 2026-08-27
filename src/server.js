const app = require('./app');
const { connectDatabase } = require('./config/db');
const { port, nodeEnv } = require('./config/env');

async function start() {
  await connectDatabase();
  const server = app.listen(port, () => console.log(`POS API listening on port ${port} (${nodeEnv})`));
  const shutdown = async (signal) => { console.log(`${signal} received, shutting down`); await server.close(); process.exit(0); };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) start().catch((error) => { console.error('Startup failed:', error.message); process.exit(1); });
module.exports = { start };
