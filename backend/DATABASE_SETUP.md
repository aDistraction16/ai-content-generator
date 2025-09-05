# Database Setup Guide

## 1. Create PostgreSQL Database

First, you need to create a database for your project. Follow these steps:

### Using pgAdmin (GUI Method - Recommended for beginners):

1. Open pgAdmin (installed with PostgreSQL)
2. Connect to your local PostgreSQL server using the password you set during installation
3. Right-click on "Databases" in the left panel
4. Select "Create" > "Database..."
5. Enter the database name: `ai_content_generator`
6. Click "Save"

### Using Command Line (Alternative):

1. Open Command Prompt
2. Connect to PostgreSQL:
   ```
   psql -U postgres -h localhost
   ```
3. Enter your PostgreSQL password when prompted
4. Create the database:
   ```sql
   CREATE DATABASE ai_content_generator;
   ```
5. Exit psql:
   ```
   \q
   ```

## 2. Create Environment File

1. Navigate to the backend folder
2. Copy `.env.example` to `.env`:
   ```
   copy .env.example .env
   ```
3. Edit the `.env` file and update these values:
   - `DB_PASSWORD`: Your PostgreSQL password
   - `SESSION_SECRET`: Generate a long random string (at least 32 characters)
   - Keep other database settings as they are for local development

## 3. Generate and Run Database Migrations

After setting up the database and environment variables:

1. Generate migration files:
   ```
   npm run db:generate
   ```

2. Run migrations to create tables:
   ```
   npm run db:migrate
   ```

## What's Next?

Once you complete these steps, we'll continue building the API endpoints and authentication system.
