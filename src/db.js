const { PrismaClient } = require('@prisma/client');

// Singleton so we don't exhaust DB connections with hot-reload in dev.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
