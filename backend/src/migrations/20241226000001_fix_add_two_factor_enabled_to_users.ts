'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists to avoid errors
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.two_factor_enabled) {
      await queryInterface.addColumn('users', 'two_factor_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log('Successfully added two_factor_enabled column to users table');
    } else {
      console.log('Column two_factor_enabled already exists in users table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.two_factor_enabled) {
      await queryInterface.removeColumn('users', 'two_factor_enabled');
      console.log('Successfully removed two_factor_enabled column from users table');
    }
  },
}; 