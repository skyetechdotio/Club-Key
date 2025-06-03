# SQL Scripts

This directory contains manually-run SQL scripts that are separate from Drizzle Kit's managed migrations.

## Files

### Manual Database Setup Scripts
- **`database-rls-policies.sql`** - Row Level Security policies for Supabase
- **`insert-test-data.sql`** - Sample data for development/testing

### Column Addition Scripts  
- **`missing_reset_token_columns.sql`** - Adds password reset functionality columns

## Notes

- These scripts should be run manually when needed
- Check if columns already exist before running addition scripts
- The Drizzle Kit migrations in `/migrations/` handle the main schema evolution 