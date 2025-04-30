const express = require('express');
const dotenv = require('dotenv');
const router=require('./routes/emailRoutes');
const cookieParser = require('cookie-parser')
dotenv.config();

const userRoutes = require('./routes/userRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/users', userRoutes);
app.use('/api/emails', emailRoutes);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

module.exports = app;