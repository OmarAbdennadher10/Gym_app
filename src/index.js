require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const planRoutes = require('./routes/plan');
const weightLogRoutes = require('./routes/weightLog');
const sessionRoutes = require('./routes/session');
const groceryRoutes = require('./routes/grocery');
const excludedIngredientsRoutes = require('./routes/excludedIngredients');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/plan', planRoutes);
app.use('/weight-log', weightLogRoutes);
app.use('/session', sessionRoutes);
app.use('/grocery', groceryRoutes);
app.use('/excluded-ingredients', excludedIngredientsRoutes);

// Central error handler (catches anything that slips past route-level try/catch)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gym AI backend listening on port ${PORT}`);
});
