/**
 * Email model definition
 * @module models/Email
 */
module.exports = (sequelize, DataTypes) => {
  const Email = sequelize.define('Email', {
    sender: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: { msg: 'Please provide a valid email address' }
      }
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    htmlContent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'emails'
  });

  return Email;
};