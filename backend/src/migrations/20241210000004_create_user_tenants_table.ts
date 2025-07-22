'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_tenants', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('member', 'admin', 'moderator', 'viewer'),
        allowNull: false,
        defaultValue: 'member',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended', 'pending'),
        allowNull: false,
        defaultValue: 'active',
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      last_access_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      preferences: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // Add unique constraint for user-tenant combination
    await queryInterface.addIndex('user_tenants', ['user_id', 'tenant_id'], {
      name: 'unique_user_tenant',
      unique: true,
    });

    // Add indexes
    await queryInterface.addIndex('user_tenants', ['user_id'], {
      name: 'idx_user_tenants_user_id',
    });

    await queryInterface.addIndex('user_tenants', ['tenant_id'], {
      name: 'idx_user_tenants_tenant_id',
    });

    await queryInterface.addIndex('user_tenants', ['role'], {
      name: 'idx_user_tenants_role',
    });

    await queryInterface.addIndex('user_tenants', ['status'], {
      name: 'idx_user_tenants_status',
    });

    await queryInterface.addIndex('user_tenants', ['joined_at'], {
      name: 'idx_user_tenants_joined_at',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_tenants');
  },
}; 