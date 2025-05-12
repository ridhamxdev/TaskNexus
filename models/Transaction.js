module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'The user who initiated the transaction'
    },
    type: {
      type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer', 'daily_deduction'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Amount must be a decimal number' },
        min: { args: [0.01], msg: 'Amount must be greater than 0' }
      }
    },
    sourceAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'The account from which the amount is deducted'
    },
    destinationAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'The account to which the amount is credited'
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    batchId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sourceAccountEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: { msg: 'Source account email must be a valid email' }
      },
      comment: 'The email of the account from which the amount is deducted'
    },
    destinationAccountEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: { msg: 'Destination account email must be a valid email' }
      },
      comment: 'The email of the account to which the amount is credited'
    },
  }, {
    timestamps: true,
    tableName: 'transactions'
  });

  Transaction.associate = function(models) {
    Transaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Transaction.belongsTo(models.User, {
      foreignKey: 'recipientId',
      as: 'recipient'
    });
  };

  return Transaction;
};