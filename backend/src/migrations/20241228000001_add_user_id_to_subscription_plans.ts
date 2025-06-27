'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if user_id column already exists
    const tableDescription = await queryInterface.describeTable('subscription_plans');
    
    if (!tableDescription.user_id) {
      // Add user_id column only if it doesn't exist
      await queryInterface.addColumn('subscription_plans', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
    }

    // Add index for better performance when querying user-specific plans
    try {
      await queryInterface.addIndex('subscription_plans', ['user_id']);
    } catch (error) {
      console.log('Note: Index on user_id might already exist.');
    }
    
    // Try to remove unique constraint on name column if it exists
    try {
      // First try the most common constraint name
      await queryInterface.removeConstraint('subscription_plans', 'subscription_plans_name_key');
    } catch (error) {
      try {
        // Try alternative constraint name
        await queryInterface.removeConstraint('subscription_plans', 'name');
      } catch (error2) {
        try {
          // Try removing index instead of constraint
          await queryInterface.removeIndex('subscription_plans', 'subscription_plans_name_key');
        } catch (error3) {
          // If all attempts fail, continue - the constraint might not exist
          console.log('Note: Could not remove unique constraint on name column. This is expected if it doesn\'t exist.');
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('subscription_plans', ['user_id']);
    } catch (error) {
      console.log('Note: Could not remove user_id index.');
    }
    
    const tableDescription = await queryInterface.describeTable('subscription_plans');
    if (tableDescription.user_id) {
      await queryInterface.removeColumn('subscription_plans', 'user_id');
    }
    
    // Re-add unique constraint to name column
    try {
      await queryInterface.addIndex('subscription_plans', ['name'], {
        unique: true,
        name: 'subscription_plans_name_key'
      });
    } catch (error) {
      console.log('Note: Could not re-add unique constraint on name column.');
    }
  },
}; 