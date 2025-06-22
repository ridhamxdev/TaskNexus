'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscription_payments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user_subscriptions',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      payment_method: {
        type: Sequelize.ENUM('credit_card', 'paypal', 'bank_transfer', 'balance'),
        allowNull: false,
      },
      payment_reference: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
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
    await queryInterface.addIndex('subscription_payments', ['subscription_id']);
    await queryInterface.addIndex('subscription_payments', ['status']);
    await queryInterface.addIndex('subscription_payments', ['payment_method']);
    await queryInterface.addIndex('subscription_payments', ['payment_date']);
    await queryInterface.addIndex('subscription_payments', ['subscription_id', 'status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscription_payments');
  },
}; 