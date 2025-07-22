'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tenant_invitations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
      invited_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      invited_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      invitation_type: {
        type: Sequelize.ENUM('email', 'phone', 'both'),
        allowNull: false,
        defaultValue: 'email',
      },
      invitation_token: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      accepted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejected_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
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
    });

    // Add indexes
    await queryInterface.addIndex('tenant_invitations', ['tenant_id'], {
      name: 'idx_tenant_invitations_tenant_id',
    });

    await queryInterface.addIndex('tenant_invitations', ['invitation_token'], {
      name: 'idx_tenant_invitations_token',
      unique: true,
    });

    await queryInterface.addIndex('tenant_invitations', ['email'], {
      name: 'idx_tenant_invitations_email',
    });

    await queryInterface.addIndex('tenant_invitations', ['status'], {
      name: 'idx_tenant_invitations_status',
    });

    await queryInterface.addIndex('tenant_invitations', ['expires_at'], {
      name: 'idx_tenant_invitations_expires_at',
    });

    // Composite index for checking pending invitations by tenant and email
    await queryInterface.addIndex('tenant_invitations', ['tenant_id', 'email', 'status'], {
      name: 'idx_tenant_invitations_tenant_email_status',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenant_invitations');
  },
}; 