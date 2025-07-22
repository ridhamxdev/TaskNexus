'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tenants', 'username');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tenants', 'username', {
      type: Sequelize.STRING,
      allowNull: true, // Make it nullable for rollback compatibility
      unique: false
    });
  }
}; 