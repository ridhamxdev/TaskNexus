'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create fee_versions table for semantic versioning
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

    // Create unique index for user-feeType combination to ensure only one current version per type
    await queryInterface.addIndex('fee_versions', ['user_id', 'fee_type'], {
      name: 'idx_fee_versions_user_type',
      unique: true,
    });

    // Create index for version lookups
    await queryInterface.addIndex('fee_versions', ['version'], {
      name: 'idx_fee_versions_version',
    });

    // Create index for change tracking
    await queryInterface.addIndex('fee_versions', ['changed_by_user_id'], {
      name: 'idx_fee_versions_changed_by',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('fee_versions');
  },
}; 