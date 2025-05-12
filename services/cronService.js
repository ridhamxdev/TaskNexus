const { User, Transaction, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const { Op } = require('sequelize');  // Add this at the top with other requires

/**
 * @fileoverview Daily Deduction Service
 * 
 * This service handles the automatic daily deduction of 50 Rs from user accounts.
 * It uses an idempotent design to ensure the process runs exactly once per day,
 * even when deployed across multiple server instances.
 *
 */

/**
 * Processes the daily deduction from all eligible user accounts
 * 
 * Logic:
 * 1. Deducts 50 Rs from each user with sufficient balance (≥ 50 Rs)
 * 2. Transfers the total collected amount to the superadmin account
 * 3. Creates transaction records for all operations
 * 4. Uses a unique batch ID to prevent duplicate processing
 * 
 * @async
 * @function processDailyDeduction
 * @returns {Promise<void>} - Resolves when the process completes
 * @throws {Error} - If the superadmin account is not found or database errors occur
 */
// Modify the processDailyDeduction function to add better error handling and logging
// Add this parameter to the function
// At the top of the file, update the import
// Change this line
// const { sequelize, refreshConnections } = require('../config/database');

// To this
const { refreshConnections } = require('../config/database');

// Add this at the beginning of processDailyDeduction function
async function processDailyDeduction(forceRun = false) {
  try {
    // Refresh database connections to ensure we have a clean state
    await refreshConnections();
    
    // Create a date-based batch ID
    const today = new Date().toISOString().split('T')[0];
    const batchId = `daily_${today}`;
    
    console.log(`Checking for batch ID: ${batchId}`);
    
    // Check if today's batch already exists (skip if forceRun is true)
    if (!forceRun) {
      const existingBatch = await Transaction.findOne({
        where: { batchId }
      });
      
      if (existingBatch) {
        console.log(`Daily deduction for ${today} already processed. Batch ID: ${batchId}`);
        return;
      }
    } else {
      console.log(`Force run enabled, bypassing batch check for ${batchId}`);
    }
    
    console.log('No existing batch found, proceeding with daily deduction...');
    
    const t = await sequelize.transaction();
    
    try {
      console.log('Starting daily deduction process...');
      
      // Find superadmin first to ensure they exist
      const superadmin = await User.findOne({
        where: { role: 'superadmin' },
        transaction: t
      });
      
      if (!superadmin) {
        throw new Error('Superadmin not found');
      }
      
      // In the processDailyDeduction function, update the user query:
      
      // Find all regular users with balance >= 50 (excluding soft-deleted users)
      const users = await User.findAll({
        where: {
          role: 'user',
          balance: {
            [Op.gte]: 50
          },
          deletedAt: null  // Add this line to exclude soft-deleted users
        },
        transaction: t
      });
      
      console.log(`Found ${users.length} users with sufficient balance`);
      
      let totalDeducted = 0;
      const deductionAmount = 50; // 50 Rs
      
      // Process each user
      for (const user of users) {
        // Create transaction record for the user
        await Transaction.create({
          userId: user.id,
          type: 'daily_deduction',
          amount: deductionAmount,
          sourceAccountId: user.id,           
          destinationAccountId: superadmin.id, 
          sourceAccountEmail: user.email,     // Add this line - source user's email
          destinationAccountEmail: superadmin.email, // Add this line - superadmin's email
          description: 'Daily automatic deduction',
          status: 'completed',
          reference: uuidv4(),
          batchId
        }, { transaction: t });
        
        // Update user balance
        await user.update({
          balance: sequelize.literal(`balance - ${deductionAmount}`)
        }, { transaction: t });
        
        totalDeducted += deductionAmount;
      }
      
      // Create marker transaction with a more unique reference
      const markerReference = `marker_${batchId}_${Date.now()}`;
      await Transaction.create({
        userId: superadmin.id,
        type: 'withdrawal',
        amount: 0.01,
        sourceAccountId: null,              
        destinationAccountId: null,          
        sourceAccountEmail: null,           // Add this line
        destinationAccountEmail: null,      // Add this line
        description: 'Daily deduction marker',
        status: 'completed',
        reference: markerReference,
        batchId
      }, { transaction: t });
      
      if (totalDeducted > 0) {
        // Create transaction record for superadmin
        await Transaction.create({
          userId: superadmin.id,
          type: 'deposit',
          amount: totalDeducted,
          sourceAccountId: null,              
          destinationAccountId: superadmin.id, 
          sourceAccountEmail: 'multiple.users@system.com',  // Add this line - indicate multiple sources
          destinationAccountEmail: superadmin.email,        // Add this line - superadmin's email
          description: `Daily collection from ${users.length} users`,
          status: 'completed',
          reference: uuidv4(),
          batchId
        }, { transaction: t });
        
        // Update superadmin balance
        await superadmin.update({
          balance: sequelize.literal(`balance + ${totalDeducted}`)
        }, { transaction: t });
      }
      
      await t.commit();
      console.log(`Successfully processed daily deduction. Total amount: ${totalDeducted} Rs`);
      
    } catch (error) {
      // If error is a unique constraint violation on the marker transaction,
      // another server is already processing this batch
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('Another server is already processing this batch');
        await t.rollback();
        return;
      }
      
      await t.rollback();
      console.error(`Error in daily deduction process: ${error.message}`);
      console.error(error.stack); // Log the full stack trace
    }
  } catch (outerError) {
    // Catch any errors that might occur outside the transaction
    console.error(`Critical error in daily deduction process: ${outerError.message}`);
    console.error(outerError.stack);
  }
}

/**
 * Initializes all scheduled cron jobs for the application
 * 
 * Currently scheduled jobs:
 * - Daily deduction: Runs at 1:00 AM every day
 * 
 * @function initCronJobs
 * @returns {void}
 */
function initCronJobs() {
  // Schedule daily deduction at 1:00 AM
  cron.schedule('*/1 * * * *', processDailyDeduction);
  
  console.log('Cron jobs initialized');
}

// Update the exports
module.exports = {
  initCronJobs,
  processDailyDeduction // Exported for testing purposes
};

// Add at the bottom of the file, after the module.exports

// If this file is run directly (not required as a module)
if (require.main === module) {
  // Load environment variables
  require('dotenv').config({ path: '../.env' });
  
  // Connect to database
  const { connectDB } = require('../config/database');
  connectDB();
  
  // Initialize cron jobs
  initCronJobs();
  
  console.log('Cron service started as standalone process');
}