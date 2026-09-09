const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { profileInputSchema } = require('../services/profileSchema');

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const parsed = profileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const p = parsed.data;

  const profile = await prisma.userProfile.create({
    data: {
      userId: req.userId,
      gender: p.gender,
      age: p.age,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      goal: p.goal,
      activityLevel: p.activityLevel,
      experienceLevel: p.experienceLevel,
      equipment: p.equipment,
      daysPerWeek: p.daysPerWeek,
      dietaryRestrictions: JSON.stringify(p.dietaryRestrictions),
      injuriesOrLimitations: JSON.stringify(p.injuriesOrLimitations),
      targetWeightKg: p.targetWeightKg,
    },
  });

  return res.status(201).json(serializeProfile(profile));
});

router.get('/latest', async (req, res) => {
  const profile = await prisma.userProfile.findFirst({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!profile) return res.status(404).json({ error: 'No profile found' });
  return res.json(serializeProfile(profile));
});

function serializeProfile(p) {
  return {
    ...p,
    dietaryRestrictions: JSON.parse(p.dietaryRestrictions),
    injuriesOrLimitations: JSON.parse(p.injuriesOrLimitations),
  };
}

module.exports = router;
