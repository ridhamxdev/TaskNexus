'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if type column exists, if not add it
    const tableInfo = await queryInterface.describeTable('fee_configurations');
    
    if (!tableInfo.type) {
      await queryInterface.addColumn('fee_configurations', 'type', {
        type: Sequelize.ENUM('send_money', 'subscription'),
        allowNull: false,
        defaultValue: 'send_money',
      });
    }

    // Check if subscriptionPlanId column exists, if not add it
    if (!tableInfo.subscriptionPlanId) {
      await queryInterface.addColumn('fee_configurations', 'subscriptionPlanId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'subscription_plans',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    // Make minAmount and maxAmount nullable to support subscription fees
    if (tableInfo.minAmount && !tableInfo.minAmount.allowNull) {
      await queryInterface.changeColumn('fee_configurations', 'minAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (tableInfo.maxAmount && !tableInfo.maxAmount.allowNull) {
      await queryInterface.changeColumn('fee_configurations', 'maxAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    // Update existing records to ensure they're marked as send_money type
    await queryInterface.sequelize.query(
      "UPDATE fee_configurations SET type = 'send_money' WHERE type IS NULL OR type = ''"
    );
  },

  async down(queryInterface, Sequelize) {
    // Check if columns exist before removing them
    const tableInfo = await queryInterface.describeTable('fee_configurations');
    
    if (tableInfo.subscriptionPlanId) {
      await queryInterface.removeColumn('fee_configurations', 'subscriptionPlanId');
    }

    if (tableInfo.type) {
      await queryInterface.removeColumn('fee_configurations', 'type');
    }
  },
}; 