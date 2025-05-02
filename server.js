const app = require('./app');
const { connectDB } = require('./config/database');
const { sequelize } = require('./models');

// Connect to database
connectDB();

// Sync models with database
sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Error syncing database:', err);
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
