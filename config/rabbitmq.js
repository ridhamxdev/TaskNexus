/**
 * RabbitMQ configuration module
 * @module config/rabbitmq
 */
const amqp = require('amqplib');
require('dotenv').config();

// RabbitMQ connection URL
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Queue names
const QUEUES = {
  EMAIL_QUEUE: 'email_queue',
  DEAD_LETTER_QUEUE: 'email_dead_letter_queue'
};

// Exchange names
const EXCHANGES = {
  EMAIL_EXCHANGE: 'email_exchange',
  DEAD_LETTER_EXCHANGE: 'email_dead_letter_exchange'
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Connect to RabbitMQ server
 * @returns {Promise<amqp.Connection>} RabbitMQ connection
 */
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    console.log('RabbitMQ connected successfully');
    
    // Handle connection errors
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });
    
    return connection;
  } catch (error) {
    console.error('RabbitMQ connection failed:', error);
    throw error;
  }
};

/**
 * Create a channel from the connection
 * @param {amqp.Connection} connection - RabbitMQ connection
 * @returns {Promise<amqp.Channel>} RabbitMQ channel
 */
const createChannel = async (connection) => {
  try {
    const channel = await connection.createChannel();
    return channel;
  } catch (error) {
    console.error('Failed to create RabbitMQ channel:', error);
    throw error;
  }
};

/**
 * Setup queues and exchanges for email processing
 * @param {amqp.Channel} channel - RabbitMQ channel
 */
const setupEmailQueues = async (channel) => {
  try {
    // Setup dead letter exchange
    await channel.assertExchange(EXCHANGES.DEAD_LETTER_EXCHANGE, 'direct', { durable: true });
    
    // Setup dead letter queue
    await channel.assertQueue(QUEUES.DEAD_LETTER_QUEUE, { 
      durable: true 
    });
    
    // Bind dead letter queue to exchange
    await channel.bindQueue(
      QUEUES.DEAD_LETTER_QUEUE, 
      EXCHANGES.DEAD_LETTER_EXCHANGE, 
      'email.dead'
    );
    
    // Setup main email exchange
    await channel.assertExchange(EXCHANGES.EMAIL_EXCHANGE, 'direct', { durable: true });
    
    // Setup main email queue with dead letter configuration
    await channel.assertQueue(QUEUES.EMAIL_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER_EXCHANGE,
        'x-dead-letter-routing-key': 'email.dead'
      }
    });
    
    // Bind main queue to exchange
    await channel.bindQueue(
      QUEUES.EMAIL_QUEUE, 
      EXCHANGES.EMAIL_EXCHANGE, 
      'email.send'
    );
    
    console.log('RabbitMQ queues and exchanges setup completed');
  } catch (error) {
    console.error('Failed to setup RabbitMQ queues:', error);
    throw error;
  }
};

module.exports = {
  connectRabbitMQ,
  createChannel,
  setupEmailQueues,
  QUEUES,
  EXCHANGES,
  MAX_RETRIES,
  RETRY_DELAY
};