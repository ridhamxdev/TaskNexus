'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'subscription_plans',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'cancelled', 'expired', 'pending', 'suspended'),
        allowNull: false,
        defaultValue: 'pending',
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      next_billing_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancellation_reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      auto_renew: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      emails_used: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      transactions_used: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    await queryInterface.addIndex('user_subscriptions', ['user_id']);
    await queryInterface.addIndex('user_subscriptions', ['plan_id']);
    await queryInterface.addIndex('user_subscriptions', ['status']);
    await queryInterface.addIndex('user_subscriptions', ['end_date']);
    await queryInterface.addIndex('user_subscriptions', ['next_billing_date']);
    await queryInterface.addIndex('user_subscriptions', ['auto_renew']);
    await queryInterface.addIndex('user_subscriptions', ['user_id', 'status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_subscriptions');
  },
}; 