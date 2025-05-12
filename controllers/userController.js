const { User } = require('../models');
const { Op } = require('sequelize');

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, dob } = req.body;
    const userExists = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { phone }] 
      } 
    });
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }
    
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone,
      address: req.body.address,
      dob: new Date(dob)
    });

    const token = user.generateAuthToken();
    res.status(201).json({'message': 'User registered'});
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({'message': 'Please provide email and password'});
    }
    
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }
    
    const token = user.generateAuthToken();
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        token
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        dob: user.dob,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, email, phone, address, dob } = req.body;
    const user = await User.findByPk(req.user.id);

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        return res.status(400).json({
          'message': 'Email already in use'
        });
      }
    }

    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({ where: { phone } });
      if (phoneExists) {
        return res.status(400).json({
          'message': 'Phone number already in use'
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (dob) updateData.dob = new Date(dob);

    await user.update(updateData);

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        dob: user.dob
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.destroy({ where: { id: req.user.id } });

    res.status(200).json({
      'message': 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add these methods to your existing controller

// Update user role (superadmin only)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'superadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be user, admin, or superadmin'
      });
    }
    
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent superadmin from downgrading their own role
    if (user.id === req.user.id && role !== 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot downgrade your own superadmin role'
      });
    }
    
    await user.update({ role });
    
    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete user by ID (superadmin only)
const deleteUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent superadmin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own superadmin account'
      });
    }
    
    await user.destroy();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this function to your userController.js

/**
 * Safely delete a user by ID
 * Uses soft delete to maintain referential integrity
 */
exports.safeDeleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find the user first
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Store email for reference in transactions
    const userEmail = user.email;
    
    // Begin transaction
    const t = await sequelize.transaction();
    
    try {
      // Soft delete the user
      await user.destroy({ transaction: t });
      
      // Update any transactions with null IDs but keep emails for reference
      if (user.role !== 'superadmin') { // Don't update superadmin references
        // Update sourceAccountId references but keep the email
        await Transaction.update(
          { sourceAccountId: null },
          { 
            where: { sourceAccountId: userId },
            transaction: t 
          }
        );
        
        // Update destinationAccountId references but keep the email
        await Transaction.update(
          { destinationAccountId: null },
          { 
            where: { destinationAccountId: userId },
            transaction: t 
          }
        );
        
        // Update recipientId references
        await Transaction.update(
          { recipientId: null },
          { 
            where: { recipientId: userId },
            transaction: t 
          }
        );
      }
      
      await t.commit();
      
      return res.status(200).json({
        status: 'success',
        message: `User ${userEmail} has been safely deleted`
      });
    } catch (error) {
      await t.rollback();
      console.error('Transaction error:', error);
      
      return res.status(500).json({
        status: 'error',
        message: 'Error during user deletion',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Controller error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Error processing request',
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  getAllUsers,
  updateUserRole,
  deleteUserById
};