/**
 * Email model definition with Joi validation
 * @module models/Email
 * @description Defines the Email model with essential Joi validation
 */
const Joi = require('joi');

module.exports = (sequelize, DataTypes) => {
  // Core validation schema - focused on essential validations only
  const emailSchema = Joi.object({
    recipient: Joi.string().email().required()
      .messages({ 'string.email': 'Invalid email format' }),
    subject: Joi.string().min(3).required(),
    body: Joi.string().min(5).required(),
    htmlContent: Joi.string().allow(null, ''),
    status: Joi.string().valid('pending', 'sent', 'failed').default('pending')
  });

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
        // Simplified validation using Joi
        customValidator(value) {
          const { error } = emailSchema.extract('recipient').validate(value);
          if (error) throw new Error(error.message);
        }
      }
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        customValidator(value) {
          const { error } = emailSchema.extract('subject').validate(value);
          if (error) throw new Error(error.message);
        }
      }
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        customValidator(value) {
          const { error } = emailSchema.extract('body').validate(value);
          if (error) throw new Error(error.message);
        }
      }
    },
    htmlContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        customValidator(value) {
          const { error } = emailSchema.extract('htmlContent').validate(value);
          if (error) throw new Error(error.message);
        }
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending',
      validate: {
        customValidator(value) {
          const { error } = emailSchema.extract('status').validate(value);
          if (error) throw new Error(error.message);
        }
      }
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
    tableName: 'emails',
    hooks: {
      // Simplified hook that validates only critical fields
      beforeValidate: (email) => {
        // Focus validation on the most important fields
        const dataToValidate = {
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status
        };
        
        // Validate core fields against schema
        const { error } = Joi.object({
          recipient: emailSchema.extract('recipient'),
          subject: emailSchema.extract('subject'),
          body: emailSchema.extract('body'),
          status: emailSchema.extract('status')
        }).validate(dataToValidate);
        
        if (error) throw new Error(`Validation error: ${error.message}`);
      }
    }
  });

  return Email;
};