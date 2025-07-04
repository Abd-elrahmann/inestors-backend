# Investors Management System - Backend

This is the backend API for the Investors Management System, built with Node.js, Express, and MongoDB.

## Features

- Complete investor management
- Profit distribution calculation
- Transaction tracking
- User authentication and authorization
- File uploads for documents
- Comprehensive reporting

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/investors-system
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   MAX_FILE_SIZE=10485760
   CORS_ORIGIN=http://localhost:3000
   ```

## Running the Application

### Development Mode
```
npm run dev
```

### Production Mode
```
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user (admin only)
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### Investors
- `GET /api/investors` - Get all investors
- `GET /api/investors/:id` - Get single investor
- `POST /api/investors` - Create new investor
- `PUT /api/investors/:id` - Update investor
- `DELETE /api/investors/:id` - Delete investor
- `GET /api/investors/:id/balance` - Get investor balance
- `GET /api/investors/:id/transactions` - Get investor transactions
- `GET /api/investors/:id/profits` - Get investor profit distributions
- `POST /api/investors/:investorId/documents` - Upload investor document
- `GET /api/investors/:investorId/documents` - Get investor documents
- `DELETE /api/investors/:investorId/documents/:documentId` - Delete investor document

### Profits
- `GET /api/profits` - Get all profits
- `GET /api/profits/:id` - Get single profit
- `POST /api/profits` - Create new profit
- `PUT /api/profits/:id` - Update profit
- `DELETE /api/profits/:id` - Delete profit
- `POST /api/profits/:id/calculate` - Calculate profit distributions
- `GET /api/profits/:id/distributions` - Get profit distributions
- `PUT /api/profits/:id/finalize` - Finalize profit distribution
- `PUT /api/profits/:id/close` - Close profit year
- `PUT /api/profits/distributions/:id` - Update profit distribution status

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/:transactionId/attachments` - Upload transaction attachment
- `GET /api/transactions/:transactionId/attachments` - Get transaction attachments
- `DELETE /api/transactions/:transactionId/attachments/:attachmentId` - Delete transaction attachment

### Reports
- `GET /api/reports/investors` - Get investor list report
- `GET /api/reports/profits` - Get profit distribution report
- `GET /api/reports/transactions` - Get transactions report
- `GET /api/reports/investor-summary/:id` - Get investor summary report

## Initial Setup

After setting up the backend, you need to create an admin user. You can use the provided `test-api.js` script:

```
node test-api.js
```

This script will:
1. Create an admin user (if not already exists)
2. Create a test investor
3. Create a test profit record
4. Create a test transaction

## License

This project is licensed under the ISC License. 