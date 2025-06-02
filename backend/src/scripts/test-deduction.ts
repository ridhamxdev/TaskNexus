import { Sequelize } from 'sequelize-typescript';
import { User, UserRole } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
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

async function processDeduction(): Promise<string> {
  try {
    await sequelize.authenticate();

    const users = await User.findAll({
      where: {
        role: UserRole.USER,
        balance: { [Op.gte]: 50 },
      },
    });

    let totalDeducted = 0;

    for (const user of users) {
      user.balance = Number(user.balance) - 50;
      await user.save();

      totalDeducted += 50;

      await Transaction.create({
        userId: user.id,
        amount: 50,
        type: 'DEBIT',
        description: 'Daily deduction',
        transactionDate: new Date(),
      } as any);
    }

    if (totalDeducted > 0) {
      const superadmin = await User.findOne({ where: { role: UserRole.SUPERADMIN } });
      if (superadmin) {
        superadmin.balance = Number(superadmin.balance) + totalDeducted;
        await superadmin.save();

        await Transaction.create({
          userId: superadmin.id,
          amount: totalDeducted,
          type: 'CREDIT',
          description: 'Daily credit from user deductions',
          transactionDate: new Date(),
        } as any);
      }
    }

    return `Deducted 50 from ${users.length} users. Credited ${totalDeducted} to superadmin.`;
  } catch (error) {
    return 'Error in deduction: ' + (error?.message || error);
  }
}

// Remove setInterval for API use
// setInterval(processDeduction, 30 * 1000);

processDeduction().then((msg) => {
  if (msg) console.log(msg);
  process.exit(0);
});
