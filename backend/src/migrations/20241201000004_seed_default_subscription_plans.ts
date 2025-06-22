'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Insert default subscription plans
    await queryInterface.bulkInsert('subscription_plans', [
      {
        name: 'Free',
        description: 'Basic features for personal use',
        price: 0.00,
        billing_cycle: 'monthly',
        features: JSON.stringify([
          'Up to 10 emails per month',
          'Basic email templates',
          'Up to 5 transactions per month',
          'Basic support'
        ]),
        email_quota: 10,
        transaction_limit: 5,
        status: 'active',
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Starter',
        description: 'Perfect for small businesses and startups',
        price: 9.99,
        billing_cycle: 'monthly',
        features: JSON.stringify([
          'Up to 100 emails per month',
          'Premium email templates',
          'Up to 50 transactions per month',
          'Priority support',
          'Analytics dashboard',
          'Custom branding'
        ]),
        email_quota: 100,
        transaction_limit: 50,
        status: 'active',
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Professional',
        description: 'Advanced features for growing businesses',
        price: 29.99,
        billing_cycle: 'monthly',
        features: JSON.stringify([
          'Up to 500 emails per month',
          'All premium templates',
          'Up to 200 transactions per month',
          '24/7 priority support',
          'Advanced analytics',
          'API access',
          'Custom integrations',
          'Team collaboration'
        ]),
        email_quota: 500,
        transaction_limit: 200,
        status: 'active',
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Enterprise',
        description: 'Unlimited features for large organizations',
        price: 99.99,
        billing_cycle: 'monthly',
        features: JSON.stringify([
          'Unlimited emails',
          'All premium templates',
          'Unlimited transactions',
          'Dedicated account manager',
          'Advanced analytics & reporting',
          'Full API access',
          'Custom integrations',
          'Advanced team management',
          'SLA guarantee',
          'Custom development'
        ]),
        email_quota: null, // null means unlimited
        transaction_limit: null, // null means unlimited
        status: 'active',
        sort_order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Quarterly plans
      {
        name: 'Starter Quarterly',
        description: 'Perfect for small businesses and startups (billed quarterly)',
        price: 26.97, // 10% discount from monthly
        billing_cycle: 'quarterly',
        features: JSON.stringify([
          'Up to 100 emails per month',
          'Premium email templates',
          'Up to 50 transactions per month',
          'Priority support',
          'Analytics dashboard',
          'Custom branding',
          '10% discount from monthly plan'
        ]),
        email_quota: 100,
        transaction_limit: 50,
        status: 'active',
        sort_order: 5,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Professional Quarterly',
        description: 'Advanced features for growing businesses (billed quarterly)',
        price: 80.97, // 10% discount from monthly
        billing_cycle: 'quarterly',
        features: JSON.stringify([
          'Up to 500 emails per month',
          'All premium templates',
          'Up to 200 transactions per month',
          '24/7 priority support',
          'Advanced analytics',
          'API access',
          'Custom integrations',
          'Team collaboration',
          '10% discount from monthly plan'
        ]),
        email_quota: 500,
        transaction_limit: 200,
        status: 'active',
        sort_order: 6,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Annual plans
      {
        name: 'Starter Annual',
        description: 'Perfect for small businesses and startups (billed annually)',
        price: 99.99, // ~17% discount from monthly
        billing_cycle: 'annually',
        features: JSON.stringify([
          'Up to 100 emails per month',
          'Premium email templates',
          'Up to 50 transactions per month',
          'Priority support',
          'Analytics dashboard',
          'Custom branding',
          '17% discount from monthly plan'
        ]),
        email_quota: 100,
        transaction_limit: 50,
        status: 'active',
        sort_order: 7,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Professional Annual',
        description: 'Advanced features for growing businesses (billed annually)',
        price: 299.99, // ~17% discount from monthly
        billing_cycle: 'annually',
        features: JSON.stringify([
          'Up to 500 emails per month',
          'All premium templates',
          'Up to 200 transactions per month',
          '24/7 priority support',
          'Advanced analytics',
          'API access',
          'Custom integrations',
          'Team collaboration',
          '17% discount from monthly plan'
        ]),
        email_quota: 500,
        transaction_limit: 200,
        status: 'active',
        sort_order: 8,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all subscription plans
    await queryInterface.bulkDelete('subscription_plans', null, {});
  },
}; 