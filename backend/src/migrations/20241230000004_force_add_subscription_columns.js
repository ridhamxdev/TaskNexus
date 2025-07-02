'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Starting to add subscription fee columns...');

      // Add subscriptionPlanId column using raw SQL
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE fee_configurations 
          ADD COLUMN subscriptionPlanId INT(11) NULL,
          ADD INDEX fk_fee_configurations_subscription_plan_idx (subscriptionPlanId),
          ADD CONSTRAINT fk_fee_configurations_subscription_plan
            FOREIGN KEY (subscriptionPlanId)
            REFERENCES subscription_plans (id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
        `);
        console.log('✅ subscriptionPlanId column added successfully');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log('⚠️ subscriptionPlanId column already exists');
        } else {
          console.error('❌ Error adding subscriptionPlanId:', error.message);
        }
      }

      // Add type column using raw SQL
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE fee_configurations 
          ADD COLUMN type ENUM('send_money', 'subscription') NOT NULL DEFAULT 'send_money';
        `);
        console.log('✅ type column added successfully');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log('⚠️ type column already exists');
        } else {
          console.error('❌ Error adding type:', error.message);
        }
      }

      // Make minAmount and maxAmount nullable
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE fee_configurations 
          MODIFY COLUMN minAmount DECIMAL(10,2) NULL,
          MODIFY COLUMN maxAmount DECIMAL(10,2) NULL;
        `);
        console.log('✅ Amount columns made nullable');
      } catch (error) {
        console.error('❌ Error modifying amount columns:', error.message);
      }

      // Set default values for existing records
      try {
        await queryInterface.sequelize.query(`
          UPDATE fee_configurations 
          SET type = 'send_money' 
          WHERE type IS NULL OR type = '';
        `);
        console.log('✅ Default type values set');
      } catch (error) {
        console.error('❌ Error setting default values:', error.message);
      }

      console.log('🎉 Migration completed successfully!');
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove foreign key constraint first
      await queryInterface.sequelize.query(`
        ALTER TABLE fee_configurations 
        DROP FOREIGN KEY fk_fee_configurations_subscription_plan;
      `);

      // Remove columns
      await queryInterface.sequelize.query(`
        ALTER TABLE fee_configurations 
        DROP COLUMN subscriptionPlanId,
        DROP COLUMN type;
      `);

      console.log('Migration rolled back successfully');
    } catch (error) {
      console.error('Error rolling back migration:', error);
      throw error;
    }
  },
}; 