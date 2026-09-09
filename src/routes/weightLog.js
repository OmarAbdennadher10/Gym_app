const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const logSchema = z.object({ weightKg: z.number().min(30).max(300) });

router.post('/', async (req, res) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const entry = await prisma.weightLog.create({
    data: { userId: req.userId, weightKg: parsed.data.weightKg },
  });
  return res.status(201).json(entry);
});

router.get('/', async (req, res) => {
  const entries = await prisma.weightLog.findMany({
    where: { userId: req.userId },
    orderBy: { loggedAt: 'asc' },
  });
  return res.json(entries);
});

module.exports = router;
