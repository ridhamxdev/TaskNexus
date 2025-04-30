# Email Notification System

This project implements an email notification system using Node.js, Express, and Nodemailer. It allows users to register, login, and send emails through a secure API.

## File Structure

```
p:\Projects\Assignment-1\
│
├── config/
│   ├── db.js                 # Database connection configuration
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
│   └── User.js               # User model schema
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

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB (local or Atlas)
- Gmail account with App Password enabled

### Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd Assignment-1
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/email-notification
JWT_SECRET=your_jwt_secret_key
EMAIL_PASSWORD=your_gmail_app_password
```

4. Start the application:
```bash
npm start
```

## Dependencies

The project requires the following npm packages:

```bash
npm install express mongoose bcryptjs jsonwebtoken nodemailer dotenv
```

- **express**: Web framework for Node.js
- **mongoose**: MongoDB object modeling tool
- **bcryptjs**: Library for hashing passwords
- **jsonwebtoken**: Implementation of JSON Web Tokens
- **nodemailer**: Module for sending emails
- **dotenv**: Loads environment variables from .env file

## API Endpoints

### Authentication

- **POST /api/auth/register**: Register a new user
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

- **POST /api/auth/login**: Login and get authentication token
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
    "to": "recipient@example.com",
    "subject": "Email Subject",
    "text": "Plain text version",
    "html": "<p>HTML version of the email</p>"
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

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issu

## License

This project is licensed under the MIT License.