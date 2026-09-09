const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { profileInputSchema } = require('../services/profileSchema');
const { generatedPlanSchema } = require('../services/planSchema');
const { buildSystemPrompt, buildUserPrompt } = require('../services/promptBuilder');
const { callLlmWithRetry } = require('../services/llm');
const nutritionScience = require('../services/nutritionScience');

const router = express.Router();
router.use(requireAuth);

// Plan generation is the expensive/abusable endpoint — rate limit it
// per-IP on top of auth (10 generations per hour).
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many plan generations. Try again later.' },
});

router.post('/generate', generateLimiter, async (req, res) => {
  const parsed = profileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const profileInput = parsed.data;

  try {
    // 1. Persist the profile that generated this plan.
    const profile = await prisma.userProfile.create({
      data: {
        userId: req.userId,
        gender: profileInput.gender,
        age: profileInput.age,
        heightCm: profileInput.heightCm,
        weightKg: profileInput.weightKg,
        goal: profileInput.goal,
        activityLevel: profileInput.activityLevel,
        experienceLevel: profileInput.experienceLevel,
        equipment: profileInput.equipment,
        daysPerWeek: profileInput.daysPerWeek,
        dietaryRestrictions: JSON.stringify(profileInput.dietaryRestrictions),
        injuriesOrLimitations: JSON.stringify(profileInput.injuriesOrLimitations),
        targetWeightKg: profileInput.targetWeightKg,
      },
    });

    // 2. Deterministic macro math — never trust the LLM with this.
    const macroTargets = nutritionScience.macros(profileInput);

    // 3. Call the LLM with a grounded, constrained prompt.
    const raw = await callLlmWithRetry({
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(profileInput, macroTargets),
    });

    // 4. Validate the shape before trusting/storing it.
    const validated = generatedPlanSchema.safeParse(raw);
    if (!validated.success) {
      return res.status(502).json({
        error: 'AI returned an unexpected format',
        detail: validated.error.issues[0].message,
      });
    }
    const plan = validated.data;

    // 5. Deactivate previous plans, store the new one as active.
    await prisma.generatedPlan.updateMany({
      where: { userId: req.userId, active: true },
      data: { active: false },
    });

    const saved = await prisma.generatedPlan.create({
      data: {
        userId: req.userId,
        profileId: profile.id,
        splitName: plan.workoutPlan.splitName,
        workoutPlanJson: JSON.stringify(plan.workoutPlan),
        mealPlanJson: JSON.stringify(plan.mealPlan),
        coachNotes: plan.coachNotes,
        calories: macroTargets.calories,
        proteinG: macroTargets.proteinG,
        carbG: macroTargets.carbG,
        fatG: macroTargets.fatG,
      },
    });

    return res.status(201).json(serializePlan(saved));
  } catch (err) {
    console.error('Plan generation failed:', err);
    return res.status(500).json({ error: 'Plan generation failed', detail: err.message });
  }
});

router.get('/active', async (req, res) => {
  const plan = await prisma.generatedPlan.findFirst({
    where: { userId: req.userId, active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!plan) return res.status(404).json({ error: 'No active plan' });
  return res.json(serializePlan(plan));
});

router.get('/history', async (req, res) => {
  const plans = await prisma.generatedPlan.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return res.json(plans.map(serializePlan));
});

function serializePlan(p) {
  return {
    id: p.id,
    splitName: p.splitName,
    workoutPlan: JSON.parse(p.workoutPlanJson),
    mealPlan: JSON.parse(p.mealPlanJson),
    coachNotes: p.coachNotes,
    macroTargets: {
      calories: p.calories,
      proteinG: p.proteinG,
      carbG: p.carbG,
      fatG: p.fatG,
    },
    active: p.active,
    createdAt: p.createdAt,
  };
}

module.exports = router;
