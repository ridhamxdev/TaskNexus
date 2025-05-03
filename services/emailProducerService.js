/**
 * Email Producer Service
 * @module services/emailProducerService
 */
const { createChannel, EXCHANGES } = require('../config/rabbitmq');
let channel = null;
let connection = null;

/**
 * Initialize the producer with a RabbitMQ connection
 * @param {Object} rabbitmqConnection - RabbitMQ connection object
 */
const initializeProducer = async (rabbitmqConnection) => {
  try {
    connection = rabbitmqConnection;
    channel = await createChannel(connection);
    console.log('Email producer initialized');
  } catch (error) {
    console.error('Failed to initialize email producer:', error);
    throw error;
  }
};

/**
 * Publish an email to the RabbitMQ queue
 * @param {Object} emailData - Email data to be sent
 * @param {number} emailData.id - Email ID in the database
 * @param {number} emailData.sender - User ID of the sender
 * @param {string} emailData.recipient - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body text
 * @param {string} emailData.htmlContent - HTML content of the email (optional)
 * @returns {Promise<boolean>} Success status
 */
const publishEmail = async (emailData) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const message = Buffer.from(JSON.stringify(emailData));
    
    const published = channel.publish(
      EXCHANGES.EMAIL_EXCHANGE,
      'email.send',
      message,
      {
        persistent: true,
        contentType: 'application/json'
      }
    );

    if (published) {
      console.log(`Email with ID ${emailData.id} published to queue`);
      return true;
    } else {
      console.error(`Failed to publish email with ID ${emailData.id} to queue`);
      return false;
    }
  } catch (error) {
    console.error('Error publishing email to queue:', error);
    throw error;
  }
};

module.exports = {
  initializeProducer,
  publishEmail
};