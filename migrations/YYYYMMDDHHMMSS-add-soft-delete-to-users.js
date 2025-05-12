'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
    
    // Add an index to improve query performance
    await queryInterface.addIndex('users', ['deletedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('users', ['deletedAt']);
    await queryInterface.removeColumn('users', 'deletedAt');
  }
};