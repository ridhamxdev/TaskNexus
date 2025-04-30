const app = require('./app');
const connectDB = require('./config/dbConn');

connectDB();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
