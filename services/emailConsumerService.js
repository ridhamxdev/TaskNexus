/**
 * Email Consumer Service
 * @module services/emailConsumerService
 */
const { createChannel, QUEUES, MAX_RETRIES } = require('../config/rabbitmq');
const { sendEmail } = require('../config/userEmail');
const { Email } = require('../models');
const { cacheUserEmails, invalidateUserEmailsCache } = require('./redisService');

let channel = null;
let connection = null;

/**
 * Initialize the consumer with a RabbitMQ connection
 * @param {Object} rabbitmqConnection - RabbitMQ connection object
 */
const initializeConsumer = async (rabbitmqConnection) => {
  try {
    connection = rabbitmqConnection;
    channel = await createChannel(connection);
    console.log('Email consumer initialized');
  } catch (error) {
    console.error('Failed to initialize email consumer:', error);
    throw error;
  }
};

/**
 * Process an email message from the queue
 * @param {Object} emailData - Email data from the queue
 * @returns {Promise<void>}
 */
const processEmail = async (emailData) => {
  try {
    console.log(`Processing email ID: ${emailData.id}`);
    
    // Send the email
    await sendEmail({
      to: emailData.recipient,
      subject: emailData.subject,
      text: emailData.body,
      html: emailData.htmlContent || emailData.body
    });
    
    // Update email status in database
    await Email.update(
      {
        status: 'sent',
        sentAt: new Date()
      },
      { where: { id: emailData.id } }
    );
    
    console.log(`Email ID ${emailData.id} sent successfully`);
    
    // Invalidate cache to ensure fresh data
    await invalidateUserEmailsCache(emailData.sender);
    
    // Update cache with latest emails
    const latestEmails = await Email.findAll({
      where: { sender: emailData.sender },
      order: [['sentAt', 'DESC']],
      limit: 10
    });
    
    await cacheUserEmails(emailData.sender, latestEmails);
    
  } catch (error) {
    console.error(`Error processing email ID ${emailData.id}:`, error);
    
    // Get current retry count
    const email = await Email.findByPk(emailData.id);
    const retryCount = email.retryCount || 0;
    
    if (retryCount < MAX_RETRIES) {
      // Update retry count and keep status as pending for retry
      await Email.update(
        {
          retryCount: retryCount + 1,
          error: error.message
        },
        { where: { id: emailData.id } }
      );
      
      // Requeue the message (it will go to the dead-letter queue if max retries exceeded)
      throw error; // This will cause the message to be nacked and potentially requeued
    } else {
      // Max retries exceeded, mark as failed
      await Email.update(
        {
          status: 'failed',
          error: `Failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`
        },
        { where: { id: emailData.id } }
      );
    }
  }
};

/**
 * Start consuming emails from the queue
 */
const startConsumer = async () => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    
    // Set prefetch to process one message at a time
    await channel.prefetch(1);
    
    // Start consuming from the email queue
    await channel.consume(QUEUES.EMAIL_QUEUE, async (msg) => {
      if (msg) {
        try {
          const emailData = JSON.parse(msg.content.toString());
          await processEmail(emailData);
          
          // Acknowledge the message if processing was successful
          channel.ack(msg);
        } catch (error) {
          // Negative acknowledge with requeue=false to send to dead-letter queue
          // if max retries exceeded
          channel.nack(msg, false, false);
        }
      }
    });
    
    console.log('Email consumer started');
  } catch (error) {
    console.error('Failed to start email consumer:', error);
    throw error;
  }
};

/**
 * Process failed emails from the dead-letter queue
 */
const processDeadLetterQueue = async () => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    
    await channel.consume(QUEUES.DEAD_LETTER_QUEUE, async (msg) => {
      if (msg) {
        try {
          const emailData = JSON.parse(msg.content.toString());
          console.log(`Processing dead letter email ID: ${emailData.id}`);
          
          // Update the email status to failed in the database
          await Email.update(
            {
              status: 'failed',
              error: 'Email moved to dead-letter queue after maximum retries'
            },
            { where: { id: emailData.id } }
          );
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing dead letter:', error);
          // Acknowledge anyway to prevent infinite loop
          channel.ack(msg);
        }
      }
    });
    
    console.log('Dead letter queue consumer started');
  } catch (error) {
    console.error('Failed to start dead letter consumer:', error);
    throw error;
  }
};

module.exports = {
  initializeConsumer,
  startConsumer,
  processDeadLetterQueue
};