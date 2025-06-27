'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add default_fee_enabled column to users table
    await queryInterface.addColumn('users', 'default_fee_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    // Create default_fee_configurations table
    await queryInterface.createTable('default_fee_configurations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      fee_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      fee_type: {
        type: Sequelize.ENUM('FIXED', 'PERCENTAGE'),
        allowNull: false,
        defaultValue: 'FIXED'
      },
      min_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      max_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true, // null means no maximum
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Insert a default fee configuration
    await queryInterface.bulkInsert('default_fee_configurations', [{
      fee_amount: 10.00,
      fee_type: 'FIXED',
      min_amount: 0.00,
      max_amount: null,
      is_active: true,
      description: 'Default transaction fee for all money transfers',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'default_fee_enabled');
    await queryInterface.dropTable('default_fee_configurations');
  },
}; 