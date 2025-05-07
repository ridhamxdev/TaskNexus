// Replace the first line
const { Email, User } = require('../models');
const { publishEmail } = require('../services/emailProducerService');
const {
  cacheUserEmails,
  getCachedUserEmails,
  cacheEmailById,
  getCachedEmailById,
  invalidateUserEmailsCache
} = require('../services/redisService');

/**
 * Send an email by publishing it to RabbitMQ queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.sendUserEmail = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { recipient, subject, body, htmlContent } = req.body;

    // Validate email first
    const { error, value } = User.validateEmail({ email: recipient });
    if (error) {
      return res.status(400).json({
        success: false,
        errors: error.details.map(err => ({
          field: err.path[0],
          message: err.message
        }))
      });
    }

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subject and body'
      });
    }

    if (!recipient || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide recipient, subject, and body'
      });
    }

    // Create email record in pending state
    const email = await Email.create({
      sender: req.user.id,
      recipient: value.email, // Use validated email
      subject,
      body,
      htmlContent: htmlContent || null,
      status: 'pending'
    });

    // Publish email to RabbitMQ queue
    await publishEmail({
      id: email.id,
      sender: req.user.id,
      recipient,
      subject,
      body,
      htmlContent: htmlContent || null
    });

    // Invalidate user emails cache when a new email is queued
    await invalidateUserEmailsCache(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Email queued for delivery',
      data: email
    });

  } catch (error) {
    console.error('Error queueing email:', error);
    
    try {
      if (req.user && req.body.recipient) {
        await Email.create({
          sender: req.user.id,
          recipient: req.body.recipient,
          subject: req.body.subject,
          body: req.body.body,
          htmlContent: req.body.htmlContent || null,
          status: 'failed',
          error: error.message
        });
      }
    } catch (saveError) {
      console.error('Error saving failed email:', saveError);
    }

    res.status(500).json({
      success: false,
      message: `Failed to queue email: ${error.message}`
    });
  }
};

/**
 * Get all emails sent by the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.getUserEmails = async (req, res) => {
  try {
    // Try to get emails from Redis cache first
    const cachedEmails = await getCachedUserEmails(req.user.id);
    
    if (cachedEmails) {
      // Return cached emails if found
      return res.status(200).json({
        success: true,
        count: cachedEmails.length,
        data: cachedEmails,
        source: 'cache'
      });
    }
    
    // If not in cache, fetch from database
    const emails = await Email.findAll({ 
      where: { sender: req.user.id },
      order: [['sentAt', 'DESC']]
    });
    
    // Cache the emails for future requests
    await cacheUserEmails(req.user.id, emails);
    
    res.status(200).json({
      success: true,
      count: emails.length,
      data: emails,
      source: 'database'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a specific email by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.getEmailById = async (req, res) => {
  try {
    // Try to get email from Redis cache first
    const cachedEmail = await getCachedEmailById(req.params.id);
    
    if (cachedEmail) {
      // Check authorization
      if (cachedEmail.sender !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this email'
        });
      }
      
      // Return cached email if found
      return res.status(200).json({
        success: true,
        data: cachedEmail,
        source: 'cache'
      });
    }
    
    // If not in cache, fetch from database
    const email = await Email.findByPk(req.params.id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    if (email.sender !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this email'
      });
    }
    
    // Cache the email for future requests
    await cacheEmailById(req.params.id, email);

    res.status(200).json({
      success: true,
      data: email,
      source: 'database'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/**
 * Get all emails sent by a specific user (superadmin only)
 */
exports.getUserEmailsByAdmin = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const emails = await Email.findAll({ 
      where: { sender: userId },
      order: [['sentAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      count: emails.length,
      data: emails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all emails in the system (superadmin only)
 */
exports.getAllEmails = async (req, res) => {
  try {
    const emails = await Email.findAll({ 
      order: [['sentAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      count: emails.length,
      data: emails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
