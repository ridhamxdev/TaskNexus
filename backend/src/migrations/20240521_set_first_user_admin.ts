'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE id = 1
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET role = 'user' 
      WHERE id = 1
    `);
  },
}; 