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
  - Performance reporting

## Technology Stack

- **Frontend**

  - React.js
  - Material-UI
  - Redux Toolkit
  - React Router

- **Backend**
  - Node.js
  - Express.js
  - PostgreSQL
  - Sequelize ORM
  - JWT Authentication

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- Docker (optional, for containerized setup)

## Project Structure

```
ict/
├── src/
│   ├── backend/
│   │   ├── config/       # Configuration files
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── seeders/      # Database seeders
│   │   ├── utils/        # Utility functions
│   │   └── server.js     # Server entry point
│   │
│   └── frontend/
│       ├── src/
│       │   ├── components/  # Reusable components
│       │   ├── layouts/     # Page layouts
│       │   ├── pages/       # Page components
│       │   ├── redux/       # State management
│       │   ├── utils/       # Utility functions
│       │   └── App.js       # Root component
│       └── public/          # Static files
│
├── docker-compose.yml     # Docker Compose for full stack
├── docker-compose.db.yml  # Docker Compose for database only
└── package.json           # Project dependencies
```

## Setup Instructions

### Option 1: Using Docker

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd ict
   ```

2. **Start the database**

   ```bash
   docker-compose -f docker-compose.db.yml up -d
   ```

3. **Start the application**

   ```bash
   docker-compose up -d
   ```

   The application will be available at:

   - Frontend: http://localhost:3333
   - Backend API: http://localhost:5555/api

### Option 2: Manual Setup

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd ict
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

3. **Setup PostgreSQL**

   - Create a PostgreSQL database named `slls_legal_clinic`
   - Ensure PostgreSQL is running on port 5432

4. **Environment Configuration**
   Create a `.env` file in the `src/backend` directory with:

   ```
   PORT=5555
   NODE_ENV=development
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=slls_legal_clinic
   DB_HOST=localhost
   DB_PORT=5432
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRY=24h
   CORS_ORIGIN=http://localhost:3333
   ```

5. **Run the application**

   ```bash
   # Start backend server (from backend directory)
   npm run dev

   # Start frontend development server (from frontend directory)
   npm start
   ```

   The application will be available at:

   - Frontend: http://localhost:3333
   - Backend API: http://localhost:5555/api

## Main API Endpoints

- **Authentication**

  - POST `/api/auth/register` - Register new user
  - POST `/api/auth/login` - User login
  - POST `/api/auth/refresh-token` - Refresh JWT token

- **Cases**

  - GET `/api/cases` - List cases (with filtering)
  - POST `/api/cases` - Create new case
  - GET `/api/cases/:id` - Get case details
  - PATCH `/api/cases/:id` - Update case
  - POST `/api/cases/:id/notes` - Add note to case
  - POST `/api/cases/:id/accept` - Solicitor accepts case
  - POST `/api/cases/:id/reassign` - Admin reassigns case

- **Admin**

  - GET `/api/admin/stats` - System statistics
  - GET `/api/admin/reports` - Generate reports
  - GET `/api/admin/users` - User management
  - GET `/api/admin/cases` - Case overview

- **Dashboard**
  - GET `/api/dashboard/stats` - Dashboard statistics
  - GET `/api/dashboard/trends` - Trend analysis
  - GET `/api/dashboard/urgent-cases` - Cases requiring attention
  - GET `/api/dashboard/activity-log` - Recent system activity

## User Roles

- **Client**: Submit and track cases, communicate with solicitors
- **Solicitor**: Accept and manage cases, communicate with clients
- **Admin**: Oversee all system operations, manage users, generate reports

## Test Accounts

For testing purposes, the following accounts are available when running in development mode:

- **Admin**: admin@justicehub.org / Admin123!
- **Solicitor**: john.smith@lawfirm.com / Solicitor123!
- **Client**: james.wilson@example.com / Client123!

## License

This project is proprietary software owned by South London Law Society.
