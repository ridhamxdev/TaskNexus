'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create global_fee_versions table
    await queryInterface.createTable('global_fee_versions', {
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
      affected_fee_types: {
        type: Sequelize.JSON,
        allowNull: true,
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

    // Create unique index for user_id to ensure only one global version per user
    await queryInterface.addIndex('global_fee_versions', ['user_id'], {
      name: 'idx_global_fee_versions_user_unique',
      unique: true,
    });

    // Create index for performance
    await queryInterface.addIndex('global_fee_versions', ['user_id', 'version'], {
      name: 'idx_global_fee_versions_user_version',
    });

    // Migrate existing fee_versions data to global versions
    // Get the highest version for each user across all fee types
    await queryInterface.sequelize.query(`
      INSERT INTO global_fee_versions (user_id, version, major_version, minor_version, patch_version, change_description, changed_by_user_id, affected_fee_types, created_at, updated_at)
      SELECT 
        user_id,
        CONCAT(MAX(major_version), '.', MAX(minor_version), '.', MAX(patch_version)) as version,
        MAX(major_version) as major_version,
        MAX(minor_version) as minor_version,
        MAX(patch_version) as patch_version,
        'Migrated from fee-type specific versions' as change_description,
        MAX(changed_by_user_id) as changed_by_user_id,
        JSON_ARRAY('send_money', 'add_money', 'subscription') as affected_fee_types,
        NOW() as created_at,
        NOW() as updated_at
      FROM fee_versions 
      GROUP BY user_id
      ON DUPLICATE KEY UPDATE
        version = VALUES(version),
        major_version = VALUES(major_version),
        minor_version = VALUES(minor_version),
        patch_version = VALUES(patch_version),
        change_description = VALUES(change_description),
        updated_at = VALUES(updated_at)
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop the global_fee_versions table
    await queryInterface.dropTable('global_fee_versions');
  }
}; 