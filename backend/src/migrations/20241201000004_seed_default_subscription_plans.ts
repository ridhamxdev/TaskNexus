'use strict';

const createPlanVariants = (basePlan) => {
  const { name, description, features, emailQuota, transactionLimit } = basePlan;
  const monthlyPrice = basePlan.price;
  
  return [
    // Monthly Plan
    {
      name: `${name}`,
      description: `${description} (Monthly)`,
      price: monthlyPrice,
      billing_cycle: 'monthly',
      features: JSON.stringify([
        ...features,
        'Monthly billing flexibility'
      ]),
      email_quota: emailQuota,
      transaction_limit: transactionLimit,
      status: 'active',
      sort_order: basePlan.sortOrder,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // Quarterly Plan (10% discount)
    {
      name: `${name} Quarterly`,
      description: `${description} (Quarterly)`,
      price: +(monthlyPrice * 3 * 0.9).toFixed(2), // 10% discount
      billing_cycle: 'quarterly',
      features: JSON.stringify([
        ...features,
        'Quarterly billing',
        '10% discount on monthly price'
      ]),
      email_quota: emailQuota,
      transaction_limit: transactionLimit,
      status: 'active',
      sort_order: basePlan.sortOrder + 1,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // Annual Plan (20% discount)
    {
      name: `${name} Annual`,
      description: `${description} (Annual)`,
      price: +(monthlyPrice * 12 * 0.8).toFixed(2), // 20% discount
      billing_cycle: 'annually',
      features: JSON.stringify([
        ...features,
        'Annual billing',
        '20% discount on monthly price'
      ]),
      email_quota: emailQuota,
      transaction_limit: transactionLimit,
      status: 'active',
      sort_order: basePlan.sortOrder + 2,
      created_at: new Date(),
      updated_at: new Date(),
    }
  ];
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Define base plans
    const basePlans = [
      {
        name: 'Starter',
        description: 'Perfect for small businesses and startups',
        price: 9.99,
        features: [
          'Up to 100 emails per month',
          'Premium email templates',
          'Up to 50 transactions per month',
          'Priority support',
          'Analytics dashboard',
          'Custom branding'
        ],
        emailQuota: 100,
        transactionLimit: 50,
        sortOrder: 1
      },
      {
        name: 'Professional',
        description: 'Advanced features for growing businesses',
        price: 29.99,
        features: [
          'Up to 500 emails per month',
          'All premium templates',
          'Up to 200 transactions per month',
          '24/7 priority support',
          'Advanced analytics',
          'API access',
          'Custom integrations',
          'Team collaboration'
        ],
        emailQuota: 500,
        transactionLimit: 200,
        sortOrder: 4
      }
    ];

    // Generate all plan variants and flatten the array
    const allPlans = basePlans.flatMap(plan => createPlanVariants(plan));

    // Insert all plan variants
    await queryInterface.bulkInsert('subscription_plans', allPlans);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all subscription plans
    await queryInterface.bulkDelete('subscription_plans', null, {});
  }
}; 