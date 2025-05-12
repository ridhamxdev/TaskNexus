'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, drop the existing foreign key constraints
    await queryInterface.removeConstraint(
      'transactions', 
      'transactions_sourceAccountId_foreign_idx'
    );
    
    await queryInterface.removeConstraint(
      'transactions', 
      'transactions_destinationAccountId_foreign_idx'
    );
    
    // Then add them back with ON DELETE SET NULL
    await queryInterface.addConstraint('transactions', {
      fields: ['sourceAccountId'],
      type: 'foreign key',
      name: 'transactions_sourceAccountId_foreign_idx',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    
    await queryInterface.addConstraint('transactions', {
      fields: ['destinationAccountId'],
      type: 'foreign key',
      name: 'transactions_destinationAccountId_foreign_idx',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to the original constraints
    await queryInterface.removeConstraint(
      'transactions', 
      'transactions_sourceAccountId_foreign_idx'
    );
    
    await queryInterface.removeConstraint(
      'transactions', 
      'transactions_destinationAccountId_foreign_idx'
    );
    
    await queryInterface.addConstraint('transactions', {
      fields: ['sourceAccountId'],
      type: 'foreign key',
      name: 'transactions_sourceAccountId_foreign_idx',
      references: {
        table: 'users',
        field: 'id'
      }
    });
    
    await queryInterface.addConstraint('transactions', {
      fields: ['destinationAccountId'],
      type: 'foreign key',
      name: 'transactions_destinationAccountId_foreign_idx',
      references: {
        table: 'users',
        field: 'id'
      }
    });
  }
};