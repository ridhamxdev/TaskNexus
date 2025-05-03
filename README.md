# Task Nexus - Email Notification System

This project implements a robust email notification system using Node.js and Express with message queuing via RabbitMQ. It allows users to register, login, and send emails through a secure API with reliable delivery and retry mechanisms.

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
│   └── emailController.js    # Email sending logic
│
├── middleware/
│   └── auth.js               # Authentication middleware for protected routes
│
├── migrations/               # Sequelize migrations
│   ├── 20250502083131-create-users-table.js
│   ├── 20250502083132-create-emails-table.js
│   └── 20250503221656-add-html-content-to-emails.js
│
├── models/
│   ├── User.js               # User model (Sequelize)
│   ├── Email.js              # Email model (Sequelize)
│   └── index.js              # Sequelize model loader
│
├── routes/
│   ├── authRoutes.js         # Authentication routes
│   └── emailRoutes.js        # Email routes
│
├── services/
│   ├── emailConsumerService.js # Email queue consumer
│   ├── emailProducerService.js # Email queue producer
│   └── redisService.js       # Redis caching service
│
├── seeders/                  # Sequelize seeders
├── .env                      # Environment variables
├── app.js                    # Express application setup
├── server.js                 # Server initialization
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
npm install sequelize mysql2 sequelize-cli
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

## Distributed Deployment

The application supports running different components on separate servers:

- **API Server**: Handles user requests and queues emails
- **Email Consumer Server**: Processes the email queue and sends emails
- **RabbitMQ Server**: Central message broker
- **Database Server**: Stores user and email data
- **Redis Server**: Caches frequently accessed data

Made with ❤️ by Ridham

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
```
