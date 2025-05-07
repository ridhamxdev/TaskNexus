const express = require('express');
const dotenv = require('dotenv');
const router=require('./routes/emailRoutes');
const cookieParser = require('cookie-parser')
dotenv.config();

const userRoutes = require('./routes/userRoutes');
const emailRoutes = require('./routes/emailRoutes');
const { initCronJobs } = require('./services/cronService');
const walletRoutes = require('./routes/walletRoutes');

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/users', userRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/wallet', walletRoutes);

// Add this with your other imports
const transactionRoutes = require('./routes/transactionRoutes');

// Add this with your other routes
app.use('/api/transactions', transactionRoutes);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// Initialize cron jobs
initCronJobs();

module.exports = app;