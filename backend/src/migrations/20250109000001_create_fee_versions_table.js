const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('fee_versions', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fee_type: {
        type: DataTypes.ENUM('send_money', 'add_money', 'subscription'),
        allowNull: false,
      },
      version: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '1.0.0',
      },
      major_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      minor_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      patch_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      change_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      changed_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    // Add unique constraint for user_id and fee_type combination
    await queryInterface.addConstraint('fee_versions', {
      fields: ['user_id', 'fee_type'],
      type: 'unique',
      name: 'unique_user_fee_type',
    });

    // Create index for faster queries
    await queryInterface.addIndex('fee_versions', ['user_id']);
    await queryInterface.addIndex('fee_versions', ['fee_type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fee_versions');
  }
}; 