'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Get current table description
      const tableInfo = await queryInterface.describeTable('fee_configurations');
      
      // Add subscriptionPlanId column if it doesn't exist
      if (!tableInfo.subscriptionPlanId) {
        console.log('Adding subscriptionPlanId column...');
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

      // Add type column if it doesn't exist
      if (!tableInfo.type) {
        console.log('Adding type column...');
        await queryInterface.addColumn('fee_configurations', 'type', {
          type: Sequelize.ENUM('send_money', 'subscription'),
          allowNull: false,
          defaultValue: 'send_money',
        });
      }

      // Make existing amount fields nullable
      if (tableInfo.minAmount && !tableInfo.minAmount.allowNull) {
        console.log('Making minAmount nullable...');
        await queryInterface.changeColumn('fee_configurations', 'minAmount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        });
      }

      if (tableInfo.maxAmount && !tableInfo.maxAmount.allowNull) {
        console.log('Making maxAmount nullable...');
        await queryInterface.changeColumn('fee_configurations', 'maxAmount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        });
      }

      // Set default type for existing records
      await queryInterface.sequelize.query(
        "UPDATE fee_configurations SET type = 'send_money' WHERE type IS NULL OR type = ''"
      );

      console.log('Subscription fee support added successfully!');
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('fee_configurations');
      
      if (tableInfo.subscriptionPlanId) {
        await queryInterface.removeColumn('fee_configurations', 'subscriptionPlanId');
      }

      if (tableInfo.type) {
        await queryInterface.removeColumn('fee_configurations', 'type');
      }
    } catch (error) {
      console.error('Rollback error:', error);
      throw error;
    }
  },
}; 