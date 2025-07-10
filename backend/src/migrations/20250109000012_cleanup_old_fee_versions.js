'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // This migration removes the old fee-type specific versioning system
    // Run this only after confirming that global fee versioning is working properly
    
    console.log('WARNING: This migration will remove the old fee-type specific versioning system.');
    console.log('Make sure global fee versioning is working properly before running this migration.');
    
    // Optional: You can comment out these operations until ready to fully migrate
    
    // // Drop the fee_versions table (old fee-type specific versioning)
    // await queryInterface.dropTable('fee_versions');
    
    // Note: Keeping the table for now for backward compatibility
    // Uncomment the above line when ready to fully migrate to global versioning
    
    console.log('Old fee versioning cleanup migration completed (table preserved for compatibility).');
  },

  async down(queryInterface, Sequelize) {
    // Recreate the fee_versions table if needed for rollback
    await queryInterface.createTable('fee_versions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fee_type: {
        type: Sequelize.ENUM('send_money', 'add_money', 'subscription'),
        allowNull: false,
      },
      version: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '1.0.0',
      },
      major_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      minor_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      patch_version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      change_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      changed_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Recreate indexes
    await queryInterface.addIndex('fee_versions', ['user_id', 'fee_type'], {
      name: 'idx_fee_versions_user_type',
      unique: true,
    });
  }
}; 