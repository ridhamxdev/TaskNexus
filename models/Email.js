/**
 * Email model definition with Joi validation
 * @module models/Email
 * @description Defines the Email model with integrated Joi validation
 * @requires joi
 */
const Joi = require('joi');

module.exports = (sequelize, DataTypes) => {
  /**
   * Joi validation schema for Email model
   * @constant {Object}
   * @description Defines validation rules for email data before it reaches Sequelize
   */
  const emailJoiSchema = Joi.object({
    sender: Joi.number().integer().positive().required().messages({
      'number.base': 'Sender ID must be a number',
      'number.integer': 'Sender ID must be an integer',
      'number.positive': 'Sender ID must be a positive number',
      'any.required': 'Sender ID is required'
    }),
    recipient: Joi.string().email({ minDomainSegments: 2 }).required().messages({
      'string.email': 'Recipient must be a valid email address',
      'string.empty': 'Recipient email cannot be empty',
      'any.required': 'Recipient email is required'
    }),
    subject: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Subject must be at least {#limit} characters long',
      'string.max': 'Subject cannot exceed {#limit} characters',
      'string.empty': 'Subject cannot be empty',
      'any.required': 'Subject is required'
    }),
    body: Joi.string().min(5).required().messages({
      'string.min': 'Email body must be at least {#limit} characters long',
      'string.empty': 'Email body cannot be empty',
      'any.required': 'Email body is required'
    }),
    htmlContent: Joi.string().allow(null, '').messages({
      'string.base': 'HTML content must be a string'
    }),
    status: Joi.string().valid('pending', 'sent', 'failed').default('pending').messages({
      'string.base': 'Status must be a string',
      'any.only': 'Status must be one of: pending, sent, failed'
    }),
    retryCount: Joi.number().integer().min(0).default(0).messages({
      'number.base': 'Retry count must be a number',
      'number.integer': 'Retry count must be an integer',
      'number.min': 'Retry count cannot be negative'
    }),
    sentAt: Joi.date().allow(null).messages({
      'date.base': 'Sent date must be a valid date'
    }),
    error: Joi.string().allow(null, '').messages({
      'string.base': 'Error must be a string'
    })
  });

  const Email = sequelize.define('Email', {
    sender: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      /**
       * Custom validator that uses Joi to validate the sender field
       * @param {number} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('sender').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: false,
      /**
       * Custom validator that uses Joi to validate the recipient field
       * @param {string} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('recipient').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      /**
       * Custom validator that uses Joi to validate the subject field
       * @param {string} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('subject').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
      /**
       * Custom validator that uses Joi to validate the body field
       * @param {string} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('body').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    },
    htmlContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      /**
       * Custom validator that uses Joi to validate the htmlContent field
       * @param {string|null} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('htmlContent').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending',
      /**
       * Custom validator that uses Joi to validate the status field
       * @param {string} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('status').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      /**
       * Custom validator that uses Joi to validate the retryCount field
       * @param {number} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('retryCount').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    },
    sentAt: {
      type: DataTypes.DATE,
      defaultValue: null,
      /**
       * Custom validator that uses Joi to validate the sentAt field
       * @param {Date|null} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('sentAt').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      /**
       * Custom validator that uses Joi to validate the error field
       * @param {string|null} value - The value to validate
       * @throws {Error} If validation fails
       */
      validate: {
        joiValidator(value) {
          const { error } = emailJoiSchema.extract('error').validate(value);
          if (error) throw new Error(error.details[0].message);
        }
      }
    }
  }, {
    timestamps: true,
    tableName: 'emails',
    /**
     * Hook that runs before validation to validate the entire object using Joi
     * @param {Object} email - The email instance being validated
     * @param {Object} options - Sequelize options
     * @throws {Error} If validation fails
     */
    hooks: {
      beforeValidate: (email, options) => {
        // Extract only the fields defined in the Joi schema
        const dataToValidate = {
          sender: email.sender,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          htmlContent: email.htmlContent,
          status: email.status,
          retryCount: email.retryCount,
          sentAt: email.sentAt,
          error: email.error
        };
        
        // Validate the entire object against the Joi schema
        const { error } = emailJoiSchema.validate(dataToValidate, { abortEarly: false });
        
        if (error) {
          // Combine all error messages
          const errorMessage = error.details.map(detail => detail.message).join(', ');
          throw new Error(`Validation error: ${errorMessage}`);
        }
      }
    }
  });

  return Email;
};