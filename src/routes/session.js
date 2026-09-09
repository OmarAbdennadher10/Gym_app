const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const setLogSchema = z.object({
  weightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  completed: z.boolean().optional().default(false),
});

const exerciseLogSchema = z.object({
  name: z.string().min(1),
  sets: z.array(setLogSchema).default([]),
});

const startSchema = z.object({
  planId: z.string().min(1),
  dayLabel: z.string().min(1),
  focus: z.string().min(1),
  exerciseLogs: z.array(exerciseLogSchema).default([]),
});

const updateSchema = z.object({
  exerciseLogs: z.array(exerciseLogSchema).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  completed: z.boolean().optional(),
});

// Start (or save-in-progress) a session for a given training day.
router.post('/', async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const p = parsed.data;

  const session = await prisma.workoutSession.create({
    data: {
      userId: req.userId,
      planId: p.planId,
      dayLabel: p.dayLabel,
      focus: p.focus,
      exerciseLogsJson: JSON.stringify(p.exerciseLogs),
    },
  });

  return res.status(201).json(serialize(session));
});

// Update an in-progress session (log sets as you go) or mark it complete.
router.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const p = parsed.data;

  const existing = await prisma.workoutSession.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Session not found' });

  const session = await prisma.workoutSession.update({
    where: { id: existing.id },
    data: {
      ...(p.exerciseLogs ? { exerciseLogsJson: JSON.stringify(p.exerciseLogs) } : {}),
      ...(p.durationSeconds !== undefined ? { durationSeconds: p.durationSeconds } : {}),
      ...(p.notes !== undefined ? { notes: p.notes } : {}),
      ...(p.completed !== undefined ? { completed: p.completed } : {}),
    },
  });

  return res.json(serialize(session));
});

// Full history, most recent first.
router.get('/', async (req, res) => {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: req.userId },
    orderBy: { startedAt: 'desc' },
    take: 100,
  });
  return res.json(sessions.map(serialize));
});

// History filtered to a specific day label (e.g. progress-over-time for "Push Day").
router.get('/by-day/:dayLabel', async (req, res) => {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: req.userId, dayLabel: req.params.dayLabel },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  return res.json(sessions.map(serialize));
});

function serialize(s) {
  return {
    id: s.id,
    planId: s.planId,
    dayLabel: s.dayLabel,
    focus: s.focus,
    startedAt: s.startedAt,
    durationSeconds: s.durationSeconds,
    exerciseLogs: JSON.parse(s.exerciseLogsJson),
    notes: s.notes,
    completed: s.completed,
  };
}

module.exports = router;
