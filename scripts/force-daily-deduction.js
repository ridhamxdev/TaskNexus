// Load environment variables
require('dotenv').config();

// Connect to database
const { connectDB } = require('../config/database');
connectDB();

// Import the processDailyDeduction function
const { processDailyDeduction } = require('../services/cronService');

// Run the function with force option
(async () => {
  console.log('Forcing daily deduction process...');
  await processDailyDeduction(true);
  console.log('Process completed');
  process.exit(0);
})();