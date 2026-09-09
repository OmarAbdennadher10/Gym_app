// Mirrors lib/services/nutrition_science.dart in the Flutter app.
// This lives on the server too so the backend can validate/recompute macros
// independently rather than trusting whatever the client sends.

function bmr({ gender, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // "other" — disclosed as an estimate to the user
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

function tdee(profile) {
  return bmr(profile) * (ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.375);
}

function calorieTarget(profile) {
  const maintenance = tdee(profile);
  switch (profile.goal) {
    case 'loseFat':
      return maintenance - maintenance * 0.2;
    case 'buildMuscle':
      return maintenance + maintenance * 0.12;
    case 'recomposition':
      return maintenance - maintenance * 0.05;
    default:
      return maintenance; // maintainFitness, improveEndurance
  }
}

function macros(profile) {
  const cals = calorieTarget(profile);

  let proteinPerKg = 1.6;
  if (profile.goal === 'loseFat') proteinPerKg = 2.2;
  else if (profile.goal === 'buildMuscle' || profile.goal === 'recomposition') proteinPerKg = 2.0;

  const proteinG = profile.weightKg * proteinPerKg;
  const proteinCals = proteinG * 4;
  const fatCals = cals * 0.27;
  const fatG = fatCals / 9;
  const remainingCals = Math.max(0, cals - proteinCals - fatCals);
  const carbG = remainingCals / 4;

  return {
    calories: Math.round(cals),
    proteinG: Math.round(proteinG),
    fatG: Math.round(fatG),
    carbG: Math.round(carbG),
  };
}

module.exports = { bmr, tdee, calorieTarget, macros };
