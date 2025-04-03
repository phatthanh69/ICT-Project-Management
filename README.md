# SLLS Legal Clinic Management System

A web-based system for managing the South London Law Society's legal clinic services, facilitating communication between clients and solicitors.

## Features

- **Client Management**
  - Case submission and tracking
  - Document uploads
  - Communication with assigned solicitors
  - Case status updates

- **Solicitor Management**
  - Case assignment based on specialization
  - Client communication
  - Case management tools
  - Availability tracking

- **Admin Dashboard**
  - System-wide statistics
  - User management
  - Case oversight
  - Performance monitoring

## Technology Stack

- **Frontend**
  - React.js
  - Material-UI
  - Redux Toolkit
  - React Router

- **Backend**
  - Node.js
  - Express.js
  - MongoDB
  - JWT Authentication

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Project Structure

```
slls-legal-clinic/
├── src/
│   ├── backend/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utility functions
│   │   └── index.js       # Server entry point
│   │
│   └── frontend/
│       ├── src/
│       │   ├── components/  # Reusable components
│       │   ├── pages/       # Page components
│       │   ├── redux/       # State management
│       │   ├── utils/       # Utility functions
│       │   └── App.js       # Root component
│       └── public/          # Static files
│
├── .env.example            # Environment variables template
└── package.json           # Project dependencies
```

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd slls-legal-clinic
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd src/backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # In backend directory
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on your system
   mongod
   ```

5. **Run the application**
   ```bash
   # Start backend server (from backend directory)
   npm run dev

   # Start frontend development server (from frontend directory)
   npm start
   ```

   The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Environment Variables

Required environment variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/slls_legal_clinic

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# Frontend URL
CORS_ORIGIN=http://localhost:3000
```

## API Documentation

The API documentation is available at `/api/docs` when running in development mode.

### Main API Endpoints

- **Authentication**
  - POST `/api/auth/register` - Register new user
  - POST `/api/auth/login` - User login
  - POST `/api/auth/forgot-password` - Password reset request

- **Cases**
  - GET `/api/cases` - List cases
  - POST `/api/cases` - Create new case
  - GET `/api/cases/:id` - Get case details
  - PATCH `/api/cases/:id` - Update case
  - POST `/api/cases/:id/assign` - Assign solicitor

- **Admin**
  - GET `/api/admin/stats` - System statistics
  - GET `/api/admin/users` - User management
  - GET `/api/admin/cases` - Case overview

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary software owned by South London Law Society.

## Support

For support and queries, please contact:
- Email: support@sllslegalclinic.org
- Phone: [Your Support Phone Number]