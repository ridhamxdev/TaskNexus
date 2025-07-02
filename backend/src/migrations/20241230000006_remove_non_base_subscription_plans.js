'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, remove all old subscription plans
    await queryInterface.sequelize.query(`
      DELETE FROM subscription_plans 
      WHERE name IN ('Free', 'Starter', 'Professional')
      OR name NOT IN ('Monthly Plan', 'Quarterly Plan', 'Annual Plan')
    `);

    // Update the remaining plans to ensure correct data
    const plans = [
      {
        name: 'Monthly Plan',
        description: 'Basic monthly subscription with standard features',
        price: 29.99,
        billingCycle: 'monthly',
        emailQuota: 100,
        transactionLimit: 50,
        status: 'active',
        sortOrder: 1
      },
      {
        name: 'Quarterly Plan',
        description: 'Quarterly subscription with 10% discount',
        price: 80.97, // 29.99 * 3 * 0.9 (10% discount)
        billingCycle: 'quarterly',
        emailQuota: 300,
        transactionLimit: 150,
        status: 'active',
        sortOrder: 2
      },
      {
        name: 'Annual Plan',
        description: 'Annual subscription with 20% discount',
        price: 299.99, // 29.99 * 12 * 0.8 (20% discount)
        billingCycle: 'annually',
        emailQuota: 1200,
        transactionLimit: 600,
        status: 'active',
        sortOrder: 3
      }
    ];

    // Update or insert each plan
    for (const plan of plans) {
      await queryInterface.sequelize.query(`
        INSERT INTO subscription_plans 
          (name, description, price, "billingCycle", "emailQuota", "transactionLimit", status, "sortOrder", "createdAt", "updatedAt")
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (name) 
        DO UPDATE SET 
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          "billingCycle" = EXCLUDED."billingCycle",
          "emailQuota" = EXCLUDED."emailQuota",
          "transactionLimit" = EXCLUDED."transactionLimit",
          status = EXCLUDED.status,
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW()
      `, {
        bind: [
          plan.name,
          plan.description,
          plan.price,
          plan.billingCycle,
          plan.emailQuota,
          plan.transactionLimit,
          plan.status,
          plan.sortOrder
        ]
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Restore the old plans in case of rollback
    const oldPlans = [
      {
        name: 'Free',
        description: 'Basic free plan',
        price: 0.00,
        billingCycle: 'monthly',
        emailQuota: 10,
        transactionLimit: 5,
        status: 'active',
        sortOrder: 1
      },
      {
        name: 'Starter',
        description: 'Starter plan for basic users',
        price: 9.99,
        billingCycle: 'monthly',
        emailQuota: 100,
        transactionLimit: 50,
        status: 'active',
        sortOrder: 2
      },
      {
        name: 'Professional',
        description: 'Professional plan for power users',
        price: 29.99,
        billingCycle: 'monthly',
        emailQuota: 500,
        transactionLimit: 200,
        status: 'active',
        sortOrder: 3
      }
    ];

    // Restore old plans
    for (const plan of oldPlans) {
      await queryInterface.sequelize.query(`
        INSERT INTO subscription_plans 
          (name, description, price, "billingCycle", "emailQuota", "transactionLimit", status, "sortOrder", "createdAt", "updatedAt")
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (name) 
        DO UPDATE SET 
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          "billingCycle" = EXCLUDED."billingCycle",
          "emailQuota" = EXCLUDED."emailQuota",
          "transactionLimit" = EXCLUDED."transactionLimit",
          status = EXCLUDED.status,
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW()
      `, {
        bind: [
          plan.name,
          plan.description,
          plan.price,
          plan.billingCycle,
          plan.emailQuota,
          plan.transactionLimit,
          plan.status,
          plan.sortOrder
        ]
      });
    }
  }
}; 