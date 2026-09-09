function buildSystemPrompt() {
  return `You are an exercise physiologist and sports dietitian designing a training and
nutrition plan. Ground every recommendation in mainstream, peer-reviewed
strength & conditioning practice (progressive overload, NSCA/ACSM volume and
frequency guidelines, ISSN nutrition position stands). Do not invent numbers
for calories or macros — those are provided to you and must be respected
exactly; your job is exercise selection, set/rep/rest prescriptions, weekly
split structure, exercise progression/regression for injuries, and meal
composition that hits the given macro targets.

Rules:
- Beginners: full-body or upper/lower splits, 2-4 sets/exercise, focus on
  compound movements and technique, RPE 6-7.
- Intermediate/advanced: body-part or push/pull/legs splits matched to days
  available, progressive overload via load/reps/volume, RPE 7-9.
- Respect equipment constraints and injuries strictly — provide safe
  substitutions, never prescribe a contraindicated movement.
- Meals must be realistic, use commonly available ingredients, and hit the
  macro targets within +/-5%.
- Output ONLY valid JSON matching the schema you are given. No prose, no
  markdown fences.`;
}

function buildUserPrompt(profile, macroTargets) {
  return `Athlete profile:
- Gender: ${profile.gender}, Age: ${profile.age}, Height: ${profile.heightCm}cm, Weight: ${profile.weightKg}kg
- Goal: ${profile.goal}
- Activity level: ${profile.activityLevel}
- Training experience: ${profile.experienceLevel}
- Equipment available: ${profile.equipment}
- Training days/week: ${profile.daysPerWeek}
- Dietary restrictions: ${profile.dietaryRestrictions.length ? profile.dietaryRestrictions.join(', ') : 'none'}
- Injuries/limitations: ${profile.injuriesOrLimitations.length ? profile.injuriesOrLimitations.join(', ') : 'none'}

Fixed nutrition targets (already computed — use exactly, do not recalculate):
- Daily calories: ${macroTargets.calories} kcal
- Protein: ${macroTargets.proteinG} g
- Carbs: ${macroTargets.carbG} g
- Fat: ${macroTargets.fatG} g

Produce a JSON object with:
{
  "workoutPlan": {
    "splitName": string,
    "days": [
      { "dayLabel": string, "focus": string,
        "exercises": [ { "name": string, "sets": int, "reps": string,
          "restSeconds": int, "notes": string } ] }
    ]
  },
  "mealPlan": {
    "meals": [
      { "name": string, "timeSuggestion": string,
        "items": [string], "calories": int, "proteinG": int,
        "carbG": int, "fatG": int }
    ]
  },
  "coachNotes": string
}`;
}

module.exports = { buildSystemPrompt, buildUserPrompt };
