## Key Features
- User Management : Handles user registration, authentication (with JWT), and profile management.
- Email Notification Service : Allows sending of both plain text and HTML emails, tracks delivery status, and supports retry logic for failed deliveries.
- Queue-Based Architecture : Utilizes RabbitMQ for message queuing, enabling asynchronous email processing and decoupling producers (API/email requests) from consumers (email senders).
- Dead Letter Queue : Implements a dead-letter queue for emails that fail after multiple retries, ensuring no message is lost and failures can be analyzed or retried later.
- Redis Caching : Integrates Redis to cache frequently accessed data, improving performance and reducing database load.
- Database Support : Supports both MySQL (via Sequelize ORM) and MongoDB (via Mongoose ODM), with migrations for schema management.
- RESTful API : Provides endpoints for user and email operations, protected by authentication middleware.
- Scalability : Designed so that different services (such as customer service or email consumers) can run on separate servers, all communicating via RabbitMQ.
- 
# Email Notification System

This project implements an email notification system using Node.js and Express. It allows users to register, login, and send emails through a secure API.

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
│   └── 20250502083149-create-emails-table.js
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
├── seeders/                  # Sequelize seeders
├── .env                      # Environment variables
├── app.js                    # Express application setup
├── package.json              # Project dependencies
└── README.md                 # Project documentation
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB (for master branch) or MySQL (for mysql-migration branch)
- Gmail account with App Password enabled

### Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd Assignment-1
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
   MONGO_URI=mongodb://localhost:27017/email-notification
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
   DB_NAME=email_notification
   DB_PORT=3306
   JWT_SECRET=your_jwt_secret_key
   EMAIL_SERVICE=gmail
   EMAIL_USERNAME=your_email@gmail.com
   EMAIL_PASSWORD=your_gmail_app_password
   EMAIL_FROM=your_email@gmail.com
   ```

5. For MySQL branch only, create the database:
   ```bash
   mysql -u root -p
   # Enter your password when prompted
   CREATE DATABASE email_notification;
   exit
   ```

6. Start the application:
```bash
npm start
```

## Dependencies

The project requires the following npm packages:

### Common Dependencies (Both Branches)
```bash
npm install express jsonwebtoken bcrypt nodemailer dotenv cookie-parser validator
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

- **POST /api/emails**: Send an email (requires authentication)
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

## Gmail Setup for App Password

1. Go to your Google Account settings (https://myaccount.google.com/)
2. Enable 2-Step Verification under Security
3. Generate an App Password:
   - Go to Security → App passwords
   - Select "Mail" as the app and "Other" as the device
   - Name it "NodeJS App"
   - Copy the generated password to your .env file

Made with ❤️ by Ridham

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
```
        
