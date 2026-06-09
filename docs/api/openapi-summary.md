# API Documentation

## Auth

### POST `/api/auth/signup`
Creates a user.

### POST `/api/auth/login`
Returns JWT token and user object.

## Projects

### GET `/api/projects`
Returns projects for authenticated user.

### POST `/api/projects/analyze`
Body:
```json
{
  "title": "E-commerce App",
  "requirements": "Client wants login, products, cart, payment..."
}
```

Returns AI-generated tasks, timeline, risks, team allocation, report, email update, and evaluation.

## Analytics

### GET `/api/analytics`
Returns dashboard metrics, AI usage, risks, logs, and evaluation scores.

## Automation

### POST `/api/automation/weekly-report`
Triggers n8n weekly report webhook.
