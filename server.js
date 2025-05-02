const app = require('./app');
const { connectDB, sequelize } = require('./config/database');
require('./config/redis'); // Initialize Redis connection

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
