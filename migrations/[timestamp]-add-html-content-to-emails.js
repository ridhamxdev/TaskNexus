'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('emails', 'htmlContent', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    // Also add retryCount and error columns if they're missing
    await queryInterface.addColumn('emails', 'retryCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
    
    await queryInterface.addColumn('emails', 'error', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    // Update status ENUM to include 'pending'
    await queryInterface.changeColumn('emails', 'status', {
      type: Sequelize.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('emails', 'htmlContent');
    await queryInterface.removeColumn('emails', 'retryCount');
    await queryInterface.removeColumn('emails', 'error');
    
    // Revert status ENUM
    await queryInterface.changeColumn('emails', 'status', {
      type: Sequelize.ENUM('sent', 'failed'),
      defaultValue: 'sent'
    });
  }
};