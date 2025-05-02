const { Email } = require('../models');
const { sendEmail } = require('../config/userEmail');
const {
  cacheUserEmails,
  getCachedUserEmails,
  cacheEmailById,
  getCachedEmailById,
  invalidateUserEmailsCache
} = require('../services/redisService');

exports.sendUserEmail = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { recipient, subject, body, htmlContent } = req.body;

    if (!recipient || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Please provide recipient, subject, and body'
      });
    }

    console.log('Sending email using:', {
      from: process.env.EMAIL_FROM,
      to: recipient,
      subject,
    });

    await sendEmail({
      to: recipient,
      subject,
      text: body,
      html: htmlContent || body
    });

    const email = await Email.create({
      sender: req.user.id,
      recipient,
      subject,
      body,
      status: 'sent'
    });

    // Invalidate user emails cache when a new email is sent
    // This ensures the cache is updated when the user sends a new email
    await invalidateUserEmailsCache(req.user.id);

    res.status(201).json({
      success: true,
      data: email
    });

  } catch (error) {
    console.error('Error sending email:', error);
    try {
      if (req.user && req.body.recipient) {
        await Email.create({
          sender: req.user.id,
          recipient: req.body.recipient,
          subject: req.body.subject,
          body: req.body.body,
          status: 'failed'
        });
      }
    } catch (saveError) {
      console.error('Error saving failed email:', saveError);
    }

    res.status(500).json({
      success: false,
      message: `Failed to send email: ${error.message}`
    });
  }
};

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
