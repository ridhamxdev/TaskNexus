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
async function processDailyDeduction() {
  // Create a date-based batch ID
  const today = new Date().toISOString().split('T')[0];
  const batchId = `daily_${today}`;
  
  // Check if today's batch already exists
  const existingBatch = await Transaction.findOne({
    where: { batchId }
  });
  
  if (existingBatch) {
    console.log(`Daily deduction for ${today} already processed`);
    return;
  }
  
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
    
    // Find all regular users with balance >= 50
    const users = await User.findAll({
      where: {
        role: 'user',
        balance: {
          [Op.gte]: 50  // Fixed operator usage
        }
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
    
    // Create marker transaction (but don't include it in totalDeducted)
    await Transaction.create({
      userId: superadmin.id,
      type: 'withdrawal',
      amount: 0.01,
      description: 'Daily deduction marker',
      status: 'completed',
      reference: `marker_${batchId}`,
      batchId
    }, { transaction: t });
    
    if (totalDeducted > 0) {
      // Create transaction record for superadmin
      await Transaction.create({
        userId: superadmin.id,
        type: 'deposit',
        amount: totalDeducted,
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
  cron.schedule('*/30 * * * * *', processDailyDeduction);
  
  console.log('Cron jobs initialized');
}

module.exports = {
  initCronJobs,
  processDailyDeduction // Exported for testing purposes
};