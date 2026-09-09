const { z } = require('zod');

const profileInputSchema = z.object({
  gender: z.enum(['male', 'female', 'other']),
  age: z.number().int().min(13).max(100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  goal: z.enum(['loseFat', 'buildMuscle', 'recomposition', 'maintainFitness', 'improveEndurance']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'veryActive']),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  equipment: z.enum(['fullGym', 'homeBasic', 'bodyweightOnly', 'dumbbellsOnly']),
  daysPerWeek: z.number().int().min(1).max(7),
  dietaryRestrictions: z.array(z.string()).optional().default([]),
  injuriesOrLimitations: z.array(z.string()).optional().default([]),
  targetWeightKg: z.number().optional(),
});

module.exports = { profileInputSchema };
