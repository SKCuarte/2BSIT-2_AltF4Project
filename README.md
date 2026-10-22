# 2BSIT-2_AltF4Project

## Database Setup Guide

### Database

Supabase PostgreSQL

### Project Structure

supabase/
└── migrations/
    └── 001_initial_schema.sql

scripts/
└── migrate.py

### Tables

- roles
- users
- students

### Setup Instructions

1. Open Supabase.
2. Go to SQL Editor.
3. Run the SQL code from 001_initial_schema.sql.
4. Verify the tables in Table Editor.

### Migration Runner

Run:

python scripts/migrate.py

### Files Added

- supabase/migrations/001_initial_schema.sql
- scripts/migrate.py

### Purpose

This setup provides:

- Initial database schema creation
- Migration file organization
- Migration runner script
- Setup documentation for team members
