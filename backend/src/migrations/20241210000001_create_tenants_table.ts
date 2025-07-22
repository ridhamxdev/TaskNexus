'use strict';

// Type declarations for migration
declare var module: any;

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      subdomain: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      tenant_key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      database_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      admin_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      contact_email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contact_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended', 'pending_setup'),
        allowNull: false,
        defaultValue: 'pending_setup',
      },
      subscription_tier: {
        type: Sequelize.ENUM('basic', 'standard', 'premium', 'enterprise'),
        allowNull: false,
        defaultValue: 'basic',
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      last_access_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      user_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('tenants', ['subdomain'], {
      name: 'idx_tenants_subdomain',
      unique: true,
    });

    await queryInterface.addIndex('tenants', ['tenant_key'], {
      name: 'idx_tenants_tenant_key',
      unique: true,
    });

    await queryInterface.addIndex('tenants', ['admin_user_id'], {
      name: 'idx_tenants_admin_user_id',
    });

    await queryInterface.addIndex('tenants', ['status'], {
      name: 'idx_tenants_status',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenants');
  },
}; 