const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const items = await prisma.excludedIngredient.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(items);
});

const addSchema = z.object({ name: z.string().min(1).max(100) });

router.post('/', async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const name = parsed.data.name.trim();

  const existing = await prisma.excludedIngredient.findFirst({
    where: { userId: req.userId, name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) return res.status(200).json(existing); // already excluded, no-op

  const item = await prisma.excludedIngredient.create({
    data: { userId: req.userId, name },
  });
  return res.status(201).json(item);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.excludedIngredient.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  await prisma.excludedIngredient.delete({ where: { id: existing.id } });
  return res.status(204).send();
});

module.exports = router;
