const app = require('./app');
const { connectDB, sequelize } = require('./config/database');
require('./config/redis'); // Initialize Redis connection
const { connectRabbitMQ, setupEmailQueues } = require('./config/rabbitmq');
const { initializeProducer } = require('./services/emailProducerService');
const { initializeConsumer, startConsumer, processDeadLetterQueue } = require('./services/emailConsumerService');

// Connect to database
connectDB();

// Sync models with database (without altering)
sequelize.sync().then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Error syncing database:', err);
});

// Initialize RabbitMQ
const initializeRabbitMQ = async () => {
  try {
    // Connect to RabbitMQ
    const connection = await connectRabbitMQ();
    
    // Create channel and setup queues
    const channel = await connection.createChannel();
    await setupEmailQueues(channel);
    
    // Initialize producer and consumer
    await initializeProducer(connection);
    await initializeConsumer(connection);
    
    // Start consuming emails
    await startConsumer();
    
    // Process dead letter queue
    await processDeadLetterQueue();
    
    console.log('RabbitMQ initialization completed');
  } catch (error) {
    console.error('Failed to initialize RabbitMQ:', error);
  }
};

// Initialize RabbitMQ
initializeRabbitMQ();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
