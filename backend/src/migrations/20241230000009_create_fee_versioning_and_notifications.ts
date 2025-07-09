'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Create fee_configuration_versions table
      await queryInterface.createTable('fee_configuration_versions', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        fee_configuration_id: {
          type: Sequelize.INTEGER,
          allowNull: true, // nullable for deleted configurations
          references: {
            model: 'fee_configurations',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        action: {
          type: Sequelize.ENUM('CREATED', 'UPDATED', 'DELETED'),
          allowNull: false,
        },
        type: {
          type: Sequelize.ENUM('send_money', 'add_money', 'subscription'),
          allowNull: false,
        },
        previous_values: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        current_values: {
          type: Sequelize.JSON,
          allowNull: false,
        },
        changed_by_user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        change_reason: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        user_notified: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        notified_at: {
          type: Sequelize.DATE,
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

      // Create user_notifications table
      await queryInterface.createTable('user_notifications', {
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
        type: {
          type: Sequelize.ENUM('FEE_CHANGE', 'FEE_ADDED', 'FEE_REMOVED', 'SYSTEM'),
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('UNREAD', 'READ', 'DISMISSED'),
          allowNull: false,
          defaultValue: 'UNREAD',
        },
        fee_configuration_version_id: {
          type: Sequelize.INTEGER,
          allowNull: true, // nullable for non-fee-related notifications
          references: {
            model: 'fee_configuration_versions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        email_sent: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        email_sent_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        read_at: {
          type: Sequelize.DATE,
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

      // Add indexes for better performance
      await queryInterface.addIndex('fee_configuration_versions', ['user_id']);
      await queryInterface.addIndex('fee_configuration_versions', ['fee_configuration_id']);
      await queryInterface.addIndex('fee_configuration_versions', ['created_at']);
      await queryInterface.addIndex('fee_configuration_versions', ['action']);

      await queryInterface.addIndex('user_notifications', ['user_id']);
      await queryInterface.addIndex('user_notifications', ['status']);
      await queryInterface.addIndex('user_notifications', ['type']);
      await queryInterface.addIndex('user_notifications', ['created_at']);

      console.log('✅ Successfully created fee versioning and notification tables');
    } catch (error) {
      console.error('❌ Error in migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove indexes first
      await queryInterface.removeIndex('user_notifications', ['user_id']);
      await queryInterface.removeIndex('user_notifications', ['status']);
      await queryInterface.removeIndex('user_notifications', ['type']);
      await queryInterface.removeIndex('user_notifications', ['created_at']);

      await queryInterface.removeIndex('fee_configuration_versions', ['user_id']);
      await queryInterface.removeIndex('fee_configuration_versions', ['fee_configuration_id']);
      await queryInterface.removeIndex('fee_configuration_versions', ['created_at']);
      await queryInterface.removeIndex('fee_configuration_versions', ['action']);

      // Drop tables
      await queryInterface.dropTable('user_notifications');
      await queryInterface.dropTable('fee_configuration_versions');

      console.log('✅ Successfully removed fee versioning and notification tables');
    } catch (error) {
      console.error('❌ Error in rollback:', error.message);
      throw error;
    }
  }
}; 