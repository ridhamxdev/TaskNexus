'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscription_plans', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      billing_cycle: {
        type: Sequelize.ENUM('monthly', 'quarterly', 'annually'),
        allowNull: false,
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      email_quota: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      transaction_limit: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'deprecated'),
        allowNull: false,
        defaultValue: 'active',
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('subscription_plans', ['status']);
    await queryInterface.addIndex('subscription_plans', ['billing_cycle']);
    await queryInterface.addIndex('subscription_plans', ['sort_order']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscription_plans');
  },
}; 