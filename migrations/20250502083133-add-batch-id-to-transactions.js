'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('transactions', 'batchId', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Batch ID for grouped transactions like daily deductions',
      validate: {
        notEmpty: true
      }
    });

    // Add an index for better query performance
    await queryInterface.addIndex('transactions', ['batchId'], {
      name: 'transactions_batch_id_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    try {
      // Try to remove index first
      await queryInterface.removeIndex('transactions', 'transactions_batch_id_idx');
    } catch (error) {
      // Index might not exist, continue with column removal
      console.log('Index might not exist, continuing with column removal');
    }
    
    // Then remove column
    await queryInterface.removeColumn('transactions', 'batchId');
  }
};