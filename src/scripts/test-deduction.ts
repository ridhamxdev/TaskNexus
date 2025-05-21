import { Sequelize } from 'sequelize-typescript';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity'; // adjust path if needed
import * as dotenv from 'dotenv';
import { Op } from 'sequelize';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'email_notification',
  models: [User, Transaction],
  logging: false,
});

async function processDeduction() {
  console.log('Starting deduction process...');
  try {
    await sequelize.authenticate();

    // Get all users with role 'user' and balance >= 50
    const users = await User.findAll({
      where: {
        role: 'user',
        balance: { [Op.gte]: 50 },
      },
    });

    let totalDeducted = 0;

    for (const user of users) {
      user.balance = Number(user.balance) - 50;
      await user.save();

      totalDeducted += 50;

      // Save transaction entry for user
      await Transaction.create({
        userId: user.id,
        amount: 50,
        type: 'DEBIT',
        description: 'Daily deduction',
        transactionDate: new Date(),
      } as any);
    }

    // Credit the total to the superadmin
    if (totalDeducted > 0) {
      const superadmin = await User.findOne({ where: { role: 'superadmin' } });
      if (superadmin) {
        superadmin.balance = Number(superadmin.balance) + totalDeducted;
        await superadmin.save();

        // Save transaction entry for superadmin
        await Transaction.create({
          userId: superadmin.id,
          amount: totalDeducted,
          type: 'CREDIT',
          description: 'Daily credit from user deductions',
          transactionDate: new Date(),
        } as any);
      } else {
        console.warn('No superadmin found to credit the amount.');
      }
    }

    console.log(`Deducted 50 from ${users.length} users. Credited ${totalDeducted} to superadmin.`);
  } catch (error) {
    console.error('Error in deduction:', error);
  }
}

setInterval(processDeduction, 30 * 1000); // Run every 30 seconds

// Optionally, run once immediately
processDeduction();
