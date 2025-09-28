# Expense Tracker Application

A full-stack expense tracking application built with Next.js, Node.js, and Express. This application helps users track their expenses, generate reports, and manage their finances effectively.

## Features

- **User Authentication**: Secure login and registration system
- **Expense Management**: Add, edit, delete, and categorize expenses
- **Data Visualization**: Interactive charts and graphs for expense analysis
- **Report Generation**: Export expense reports in various formats
- **Responsive Design**: Works on desktop and mobile devices
- **Data Import/Export**: Import/export expense data in CSV format

## Tech Stack

- **Frontend**: Next.js, React, Chart.js
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: CSS Modules, Ant Design
- **Build Tool**: npm

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- MongoDB (local or cloud instance)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/hiiiHimanshu/Xtend-Assigment.git
cd Xtend-Assigment
```

### 2. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd frontend
npm install
cd ..
```

### 3. Environment Setup

Create a `.env` file in the root directory and add the following environment variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Application

#### Development Mode

```bash
# Start the backend server
npm run dev:server

# In a new terminal, start the frontend
cd frontend
npm run dev
```

#### Production Mode

```bash
# Build the frontend
cd frontend
npm run build

# Start the production server (from root directory)
npm start
```

The application will be available at `http://localhost:3000`

## Available Scripts

### Server Scripts
- `npm run dev:server` - Start the server in development mode with nodemon
- `npm start` - Start the server in production mode
- `npm test` - Run tests

### Client Scripts (in /frontend directory)
- `npm run dev` - Start the Next.js development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm test` - Run tests

## Project Structure

```
/
├── config/           # Configuration files
├── database/         # Database models and connection
├── frontend/         # Next.js frontend application
│   ├── public/       # Static files
│   ├── src/          # Source code
│   │   ├── components/  # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── styles/     # CSS modules
│   │   └── utils/      # Utility functions
├── middleware/       # Express middleware
├── public/           # Static files
├── routes/           # API routes
├── scripts/          # Utility scripts
├── .env              # Environment variables
├── .env.example      # Example environment variables
├── package.json      # Backend dependencies
└── server.js         # Main server file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Expenses
- `GET /api/expenses` - Get all expenses for the logged-in user
- `POST /api/expenses` - Create a new expense
- `GET /api/expenses/:id` - Get a single expense
- `PUT /api/expenses/:id` - Update an expense
- `DELETE /api/expenses/:id` - Delete an expense
- `GET /api/expenses/summary` - Get expense summary

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a new category

## Deployment

### Heroku

1. Install the Heroku CLI
2. Login to your Heroku account
3. Create a new Heroku app
4. Set up environment variables in Heroku dashboard
5. Push to Heroku

```bash
heroku login
heroku create your-app-name
git push heroku main
```

### Vercel (Frontend)

1. Import your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js Documentation](https://nextjs.org/docs)
- [Express Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
