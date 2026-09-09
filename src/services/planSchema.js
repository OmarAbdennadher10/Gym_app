const { z } = require('zod');

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.union([z.string(), z.number()]).transform(String),
  restSeconds: z.number().int().nonnegative(),
  notes: z.string().optional().default(''),
});

const workoutDaySchema = z.object({
  dayLabel: z.string().min(1),
  focus: z.string().min(1),
  exercises: z.array(exerciseSchema).min(1),
});

const mealSchema = z.object({
  name: z.string().min(1),
  timeSuggestion: z.string().optional().default(''),
  items: z.array(z.string()).min(1),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().int().nonnegative(),
  carbG: z.number().int().nonnegative(),
  fatG: z.number().int().nonnegative(),
});

const generatedPlanSchema = z.object({
  workoutPlan: z.object({
    splitName: z.string().min(1),
    days: z.array(workoutDaySchema).min(1),
  }),
  mealPlan: z.object({
    meals: z.array(mealSchema).min(1),
  }),
  coachNotes: z.string().optional().default(''),
});

module.exports = { generatedPlanSchema };
