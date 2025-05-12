'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('transactions', 'sourceAccountEmail', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('transactions', 'destinationAccountEmail', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('transactions', 'sourceAccountEmail');
    await queryInterface.removeColumn('transactions', 'destinationAccountEmail');
  }
};