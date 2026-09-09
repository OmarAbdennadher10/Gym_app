const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const itemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().optional().default(''),
  category: z.string().optional().default('Other'),
});

router.get('/', async (req, res) => {
  const items = await prisma.groceryItem.findMany({
    where: { userId: req.userId },
    orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
  });
  return res.json(items);
});

router.post('/', async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const item = await prisma.groceryItem.create({
    data: { userId: req.userId, ...parsed.data, source: 'manual' },
  });
  return res.status(201).json(item);
});

// Pull every ingredient from the active plan's meals into the shopping list,
// de-duplicating against items already on it (case-insensitive name match).
router.post('/generate-from-meal-plan', async (req, res) => {
  const activePlan = await prisma.generatedPlan.findFirst({
    where: { userId: req.userId, active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!activePlan) return res.status(404).json({ error: 'No active meal plan' });

  const mealPlan = JSON.parse(activePlan.mealPlanJson);
  const ingredientNames = new Set();
  for (const meal of mealPlan.meals || []) {
    for (const item of meal.items || []) {
      ingredientNames.add(item.trim());
    }
  }

  const existing = await prisma.groceryItem.findMany({ where: { userId: req.userId } });
  const existingLower = new Set(existing.map((e) => e.name.toLowerCase()));

  const toCreate = [...ingredientNames]
    .filter((name) => name && !existingLower.has(name.toLowerCase()))
    .map((name) => ({
      userId: req.userId,
      name,
      quantity: '',
      category: 'Other',
      source: 'meal-plan',
    }));

  if (toCreate.length > 0) {
    await prisma.groceryItem.createMany({ data: toCreate });
  }

  const items = await prisma.groceryItem.findMany({
    where: { userId: req.userId },
    orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
  });
  return res.status(201).json(items);
});

router.patch('/:id', async (req, res) => {
  const patchSchema = z.object({
    checked: z.boolean().optional(),
    name: z.string().min(1).optional(),
    quantity: z.string().optional(),
    category: z.string().optional(),
  });
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const existing = await prisma.groceryItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const item = await prisma.groceryItem.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  return res.json(item);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.groceryItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  await prisma.groceryItem.delete({ where: { id: existing.id } });
  return res.status(204).send();
});

// Clear all checked items in one go (common "clear cart" action).
router.delete('/', async (req, res) => {
  await prisma.groceryItem.deleteMany({ where: { userId: req.userId, checked: true } });
  return res.status(204).send();
});

module.exports = router;
