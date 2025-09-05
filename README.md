# 🤖 AI-Powered Content Generator & Scheduler

> A comprehensive MERN stack application that leverages AI to generate, manage, and analyze content with advanced scheduling and reporting capabilities.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://postgresql.org/)

## 🚀 Features

### 🎯 Core Features
- **AI Content Generation**: Generate blog posts and social media content using Hugging Face AI models
- **Multi-Platform Support**: Optimized content for Twitter, LinkedIn, Facebook, Instagram
- **Content Templates**: Create and reuse templates with variable substitution
- **Smart Scheduling(Untested)**: Schedule content with status tracking (draft, scheduled, posted)
- **Advanced Analytics**: Performance metrics, engagement prediction, and trend analysis
- **PDF Reports**: Generate detailed reports with charts and insights

### 📊 Analytics & Intelligence
- **Performance Scoring**: AI-powered content quality assessment
- **Engagement Prediction**: Estimate reach and engagement potential
- **Trend Analysis**: Daily/weekly content performance trends
- **Comparative Analytics**: Period-over-period performance comparison
- **Caching System**: Redis-powered caching with in-memory fallback

### 🛡️ Security & Performance
- **Session-based Authentication**: Secure user management with bcrypt
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Graceful error handling and user feedback

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Node.js + Express.js + Drizzle ORM
- **Database**: PostgreSQL with migrations
- **AI**: Hugging Face Inference API
- **Caching**: Redis (with in-memory fallback)
- **Email(Untested)**: SendGrid integration
- **Reports**: PDFKit for PDF generation

### Project Structure
```
ai-content-generator/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── services/        # API communication layer
│   │   ├── contexts/        # React context providers
│   │   └── ...
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic layer
│   │   ├── models/          # Database schemas
│   │   ├── middleware/      # Express middleware
│   │   └── config/          # Configuration files
│   └── drizzle/            # Database migrations
└── docs/                   # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional, uses in-memory fallback)
- Hugging Face API token

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-content-generator
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npx drizzle-kit push  # Apply database migrations
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Environment Variables**
   ```bash
   # Backend (.env)
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=ai_content_generator
   HUGGINGFACE_TOKEN=your_huggingface_token
   SESSION_SECRET=your_session_secret
   REDIS_URL=redis://localhost:6379
   SENDGRID_API_KEY=your_sendgrid_key (optional)
   ```

## 📱 Usage

1. **Register/Login**: Create an account or login
2. **Generate Content**: Use AI to create blog posts or social media content
3. **Create Templates**: Build reusable content templates
4. **Schedule Content**: Plan your content calendar
5. **View Analytics**: Monitor performance and engagement
6. **Generate Reports**: Create PDF reports for analysis

## 🔧 Development

### Running Tests
```bash
# Frontend tests
cd frontend && npm test

# Backend tests (if implemented)
cd backend && npm test
```

### Database Operations
```bash
# Generate migration
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit push

# View database studio
npx drizzle-kit studio
```

## 📊 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Content Management
- `GET /api/content` - Get user's content
- `POST /api/content/generate` - Generate new content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### Templates
- `GET /api/templates` - Get user's templates
- `POST /api/templates` - Create template
- `POST /api/templates/generate` - Generate from template

### Analytics
- `GET /api/content/analytics/advanced` - Advanced analytics
- `GET /api/content/analytics/performance` - Performance metrics

### Reports
- `POST /api/reports/generate` - Generate PDF report
- `GET /api/reports` - Get user's reports

## 🙏 Acknowledgments

- [Hugging Face](https://huggingface.co/) for AI inference API
- [Material-UI](https://mui.com/) for React components
- [Drizzle ORM](https://orm.drizzle.team/) for database management
- [SendGrid](https://sendgrid.com/) for email services
---

**Built with ❤️ using the MERN stack + TypeScript**
