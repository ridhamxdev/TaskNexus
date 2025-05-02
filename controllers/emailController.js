const { Email } = require('../models');
const { sendEmail } = require('../config/userEmail');

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
    const emails = await Email.findAll({ 
      where: { sender: req.user.id },
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

exports.getEmailById = async (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      data: email
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
