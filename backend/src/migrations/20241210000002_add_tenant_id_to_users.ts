'use strict';

// Type declarations for migration
declare var module: any;

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add tenant role to existing enum
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('user', 'tenant', 'superadmin') DEFAULT 'user'
    `);

    // Add tenantId column to users table
    await queryInterface.addColumn('users', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tenants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index for tenant_id
    await queryInterface.addIndex('users', ['tenant_id'], {
      name: 'idx_users_tenant_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the index
    await queryInterface.removeIndex('users', 'idx_users_tenant_id');
    
    // Remove the column
    await queryInterface.removeColumn('users', 'tenant_id');

    // Revert role enum (remove tenant)
    await queryInterface.sequelize.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('user', 'superadmin') DEFAULT 'user'
    `);
  },
}; 