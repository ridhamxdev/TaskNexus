'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Add fee-related columns to transactions table
      await queryInterface.addColumn('transactions', 'fee_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        comment: 'Fee amount for this transaction'
      });

      await queryInterface.addColumn('transactions', 'fee_type', {
        type: Sequelize.ENUM('SEND_MONEY', 'ADD_MONEY', 'SUBSCRIPTION'),
        allowNull: true,
        defaultValue: null,
        comment: 'Type of fee applied'
      });

      await queryInterface.addColumn('transactions', 'is_fee_transaction', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this transaction is a fee transaction'
      });

      console.log('✅ Successfully added fee fields to transactions table');
    } catch (error) {
      console.error('❌ Error in migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove fee-related columns
      await queryInterface.removeColumn('transactions', 'fee_amount');
      await queryInterface.removeColumn('transactions', 'fee_type');
      await queryInterface.removeColumn('transactions', 'is_fee_transaction');
      
      console.log('✅ Successfully removed fee fields from transactions table');
    } catch (error) {
      console.error('❌ Error in rollback:', error.message);
      throw error;
    }
  }
}; 