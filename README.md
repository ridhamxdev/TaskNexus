# Task Nexus - Email Notification & Transaction System

This project implements a robust email notification system with transaction capabilities using Node.js and Express with message queuing via RabbitMQ. It allows users to register, login, send emails, and perform financial transactions through a secure API with reliable delivery and retry mechanisms.

## Branches

This repository contains two branches with different database implementations:

- **master**: Uses MongoDB with Mongoose ODM
- **mysql-migration**: Uses MySQL with Sequelize ORM

## File Structure

### Master Branch (MongoDB)

```
│
├── config/
│   ├── db.js                 # MongoDB connection configuration
│   └── userEmail.js          # Email service configuration
│
├── controllers/
│   ├── authController.js     # Authentication logic (register, login)
│   └── emailController.js    # Email sending logic
│
├── middleware/
│   └── auth.js               # Authentication middleware for protected routes
│
├── models/
│   ├── User.js               # User model schema (Mongoose)
│   └── Email.js              # Email model schema (Mongoose)
│
├── routes/
│   ├── authRoutes.js         # Authentication routes
│   └── emailRoutes.js        # Email routes
│
├── .env                      # Environment variables
├── app.js                    # Express application setup
├── package.json              # Project dependencies
└── README.md                 # Project documentation
```

### MySQL-Migration Branch (MySQL)

```
│
├── config/
│   ├── config.json           # Sequelize configuration
│   ├── database.js           # MySQL connection configuration
│   ├── rabbitmq.js           # RabbitMQ configuration
│   ├── redis.js              # Redis caching configuration
│   └── userEmail.js          # Email service configuration
│
├── controllers/
│   ├── authController.js     # Authentication logic (register, login)
│   ├── emailController.js    # Email sending logic
│   ├── transactionController.js # Transaction management
│   ├── userController.js     # User management
│   └── walletController.js   # Wallet operations
│
├── middleware/
│   └── auth.js               # Authentication middleware for protected routes
│
├── migrations/               # Sequelize migrations
│   ├── 20250502083131-create-users-table.js
│   ├── 20250502083132-create-emails-table.js
│   ├── 20250503221656-add-html-content-to-emails.js
│   ├── 20250508000003-create-transactions-table.js
│   ├── 20250502083133-add-batch-id-to-transactions.js
│   ├── YYYYMMDDHHMMSS-add-balance-to-users.js
│   ├── YYYYMMDDHHMMSS-add-account-tracking-to-transactions.js
│   ├── YYYYMMDDHHMMSS-add-email-tracking-to-transactions.js
│   ├── YYYYMMDDHHMMSS-add-soft-delete-to-users.js
│   └── YYYYMMDDHHMMSS-fix-transaction-foreign-keys.js
│
├── models/
│   ├── User.js               # User model (Sequelize)
│   ├── Email.js              # Email model (Sequelize)
│   ├── Transaction.js        # Transaction model (Sequelize)
│   └── index.js              # Sequelize model loader
│
├── routes/
│   ├── authRoutes.js         # Authentication routes
│   ├── emailRoutes.js        # Email routes
│   ├── transactionRoutes.js  # Transaction routes
│   ├── userRoutes.js         # User management routes
│   └── walletRoutes.js       # Wallet operation routes
│
├── services/
│   ├── emailConsumerService.js # Email queue consumer
│   ├── emailProducerService.js # Email queue producer
│   ├── redisService.js       # Redis caching service
│   └── cronService.js        # Scheduled tasks service
│
├── scripts/
│   └── force-daily-deduction.js # Script to force daily deduction process
│
├── seeders/                  # Sequelize seeders
├── .env                      # Environment variables
├── app.js                    # Express application setup
├── server.js                 # Server initialization
├── ecosystem.config.js       # PM2 process manager configuration
├── package.json              # Project dependencies
└── README.md                 # Project documentation
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB (for master branch) or MySQL (for mysql-migration branch)
- RabbitMQ server
- Redis server
- Gmail account with App Password enabled

### Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd Task-Nexus
```

2. Choose the branch you want to use:
```bash
# For MongoDB version
git checkout master

# For MySQL version
git checkout mysql-migration
```

3. Install dependencies:
```bash
npm install
```

4. Create a `.env` file in the root directory with the following variables:

   For MongoDB (master branch):
   ```
    PORT=3000
    MONGO_URI=mongodb://localhost:27017/task-nexus
    JWT_SECRET=your_jwt_secret_key
    EMAIL_SERVICE=gmail
    EMAIL_USERNAME=your_email@gmail.com
    EMAIL_PASSWORD=your_gmail_app_password
    EMAIL_FROM=your_email@gmail.com
   ```

   For MySQL (mysql-migration branch):
   ```
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=task_nexus
   DB_PORT=3306
   JWT_SECRET=your_jwt_secret_key
   EMAIL_SERVICE=gmail
   EMAIL_USERNAME=your_email@gmail.com
   EMAIL_PASSWORD=your_gmail_app_password
   EMAIL_FROM=your_email@gmail.com
   RABBITMQ_URL=amqp://localhost:5672
   REDIS_URL=redis://localhost:6379
   ```

5. For MySQL branch only, create the database and run migrations:
   ```bash
   # Create database
   mysql -u root -p
   # Enter your password when prompted
   CREATE DATABASE task_nexus;
   exit
   
   # Run migrations
   npx sequelize-cli db:migrate
   ```

6. Start the application:
```bash
npm start
```

7. For production deployment with PM2:
```bash
npm install pm2 -g
pm2 start ecosystem.config.js
```

## Dependencies

The project requires the following npm packages:

### Common Dependencies (Both Branches)
```bash
npm install express jsonwebtoken bcrypt nodemailer dotenv cookie-parser validator amqplib redis
```

### MongoDB Branch
```bash
npm install mongoose
```

### MySQL Branch
```bash
npm install sequelize mysql2 sequelize-cli node-cron uuid
```

## API Endpoints

### Authentication

- **POST /api/users**: Register a new user
  ```json
  {
    "name": "User Name",
    "email": "user@example.com",
    "password": "password123",
    "phone": "1234567890",
    "address": "123 Main St",
    "dob": "1990-01-01"
  }
  ```

- **POST /api/users/login**: Login and get authentication token
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Email

- **POST /api/emails**: Queue an email for sending (requires authentication)
  ```json
  {
    "recipient": "recipient@example.com",
    "subject": "Email Subject",
    "body": "Email content",
    "htmlContent": "<p>HTML version of the email</p>"
  }
  ```
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

- **GET /api/emails**: Get all emails sent by the authenticated user (with Redis caching)
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

- **GET /api/emails/:id**: Get a specific email by ID (with Redis caching)
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

### Transactions

- **POST /api/transactions**: Create a new transaction
  ```json
  {
    "type": "deposit",
    "amount": 100.00,
    "description": "Initial deposit"
  }
  ```
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

- **GET /api/transactions**: Get all transactions for the authenticated user
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

- **POST /api/transactions/transfer**: Transfer funds to another user
  ```json
  {
    "recipientEmail": "recipient@example.com",
    "amount": 50.00,
    "description": "Payment for services"
  }
  ```
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

### Wallet

- **GET /api/wallet/balance**: Get current wallet balance
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

### User Management

- **GET /api/users/profile**: Get user profile
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

- **PUT /api/users/profile**: Update user profile
  ```json
  {
    "name": "Updated Name",
    "phone": "9876543210",
    "address": "456 New Address"
  }
  ```
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

- **DELETE /api/users/safe-delete/:id**: Safely delete a user (soft delete)
  Headers:
  ```
  Authorization: Bearer <your_token>
  ```

## RabbitMQ Setup

The application uses RabbitMQ for reliable email delivery with the following features:

- **Message Queuing**: Emails are queued for asynchronous processing
- **Retry Mechanism**: Failed emails are automatically retried up to 3 times
- **Dead Letter Queue**: Persistently failed emails are moved to a dead letter queue for later analysis

### Running RabbitMQ with Docker

```bash
# Pull and run RabbitMQ with management console
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

Access the management console at http://localhost:15672 (default credentials: guest/guest)

## Redis Setup

The application uses Redis for caching email data to improve performance:

### Running Redis with Docker

```bash
# Pull and run Redis
docker run -d --name redis -p 6379:6379 redis
```

## Email Processing Flow

1. User sends an email request via the API
2. Email is saved to the database with 'pending' status
3. Email is published to the RabbitMQ queue
4. Email consumer service processes the queue
5. If sending succeeds, email status is updated to 'sent'
6. If sending fails, it's retried up to 3 times
7. After 3 failures, email is moved to dead letter queue and marked as 'failed'

## Transaction System

The application includes a transaction system with the following features:

### Daily Deduction Service

A scheduled task that automatically deducts a fixed amount (50 Rs) from all eligible user accounts once per day:

- **Idempotent Design**: Uses batch IDs to ensure the process runs exactly once per day
- **Transaction Safety**: All operations are wrapped in database transactions
- **Account Tracking**: Records source and destination accounts for all transactions
- **Email Tracking**: Stores email addresses for better readability and tracking

### Force Run Capability

The system includes a script to force the daily deduction process when needed:

```bash
node scripts/force-daily-deduction.js
```

### Soft Delete

Users can be safely deleted without breaking referential integrity:

- **Maintains Transaction History**: Preserves all transaction records
- **Foreign Key Handling**: Updates foreign key constraints to handle deleted users
- **Email Reference**: Keeps email addresses for reference even after user deletion

## Distributed Deployment

The application supports running different components on separate servers:

- **API Server**: Handles user requests and queues emails
- **Email Consumer Server**: Processes the email queue and sends emails
- **Cron Service**: Handles scheduled tasks like daily deductions
- **RabbitMQ Server**: Central message broker
- **Database Server**: Stores user, email, and transaction data
- **Redis Server**: Caches frequently accessed data

## PM2 Process Management

The application includes PM2 configuration for production deployment:

```bash
pm2 start ecosystem.config.js
```

This starts the following processes:
- Main API server
- Email consumer service
- Cron service for scheduled tasks

Made with ❤️ by Ridham

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
```