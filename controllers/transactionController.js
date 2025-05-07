const { Transaction, User, sequelize } = require('../models');

/**
 * Get all transactions (superadmin only)
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get daily deduction batches (superadmin only)
 */
exports.getDailyDeductionBatches = async (req, res) => {
  try {
    // Get unique batch IDs for daily deductions with summary information
    const batches = await Transaction.findAll({
      attributes: [
        'batchId',
        [sequelize.fn('date', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('count', sequelize.col('id')), 'transactionCount'],
        [sequelize.fn('sum', sequelize.col('amount')), 'totalAmount']
      ],
      where: {
        type: 'daily_deduction',
        batchId: { [sequelize.Op.not]: null }
      },
      group: ['batchId', sequelize.fn('date', sequelize.col('createdAt'))],
      order: [[sequelize.fn('date', sequelize.col('createdAt')), 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get transactions for a specific batch (superadmin only)
 */
exports.getBatchTransactions = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const transactions = await Transaction.findAll({
      where: { batchId },
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user's transaction history
 */
exports.getUserTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get transactions by user ID (superadmin only)
 */
exports.getUserTransactionsByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const transactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create a new transaction
 */
exports.createTransaction = async (req, res) => {
  try {
    const { type, amount, recipientId, description } = req.body;
    
    // Validate required fields
    if (!type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction type and amount'
      });
    }
    
    // Validate transaction type
    const validTypes = ['deposit', 'withdrawal', 'transfer'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction type. Must be deposit, withdrawal, or transfer'
      });
    }
    
    // For transfers, recipient is required
    if (type === 'transfer' && !recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required for transfers'
      });
    }
    
    // Check if recipient exists for transfers
    if (type === 'transfer') {
      const recipient = await User.findByPk(recipientId);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'Recipient not found'
        });
      }
    }
    
    // Generate a unique reference
    const reference = require('uuid').v4();
    
    // Create the transaction
    const transaction = await Transaction.create({
      userId: req.user.id,
      type,
      amount,
      recipientId: type === 'transfer' ? recipientId : null,
      description,
      status: 'completed',
      reference
    });
    
    // Update user balances based on transaction type
    const user = await User.findByPk(req.user.id);
    
    if (type === 'deposit') {
      await user.update({
        balance: sequelize.literal(`balance + ${amount}`)
      });
    } else if (type === 'withdrawal') {
      // Check if user has sufficient balance
      if (user.balance < amount) {
        await transaction.update({ status: 'failed' });
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }
      
      await user.update({
        balance: sequelize.literal(`balance - ${amount}`)
      });
    } else if (type === 'transfer') {
      // Check if user has sufficient balance
      if (user.balance < amount) {
        await transaction.update({ status: 'failed' });
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }
      
      const recipient = await User.findByPk(recipientId);
      
      // Update sender's balance
      await user.update({
        balance: sequelize.literal(`balance - ${amount}`)
      });
      
      // Update recipient's balance
      await recipient.update({
        balance: sequelize.literal(`balance + ${amount}`)
      });
    }
    
    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};