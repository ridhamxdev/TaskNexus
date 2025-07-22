'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tenants', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      defaultValue: 'temp_username' // Temporary default for existing records
    });
    
    await queryInterface.addColumn('tenants', 'password_hash', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '$2b$10$defaultHashForExistingRecords' // Temporary default for existing records
    });
    
    // Remove default values after adding columns (they were just for existing records)
    await queryInterface.changeColumn('tenants', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
    
    await queryInterface.changeColumn('tenants', 'password_hash', {
      type: Sequelize.STRING,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tenants', 'password_hash');
    await queryInterface.removeColumn('tenants', 'username');
  }
}; 