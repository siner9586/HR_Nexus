# Environment

| Variable | Required | Notes |
| --- | --- | --- |
| DATABASE_URL | yes | PostgreSQL connection URL. |
| DIRECT_URL | yes | Direct PostgreSQL connection for Prisma. |
| NEXTAUTH_SECRET | yes | Long random secret. |
| NEXTAUTH_URL | yes | Application URL. |
| APP_URL | yes | Application URL used by server actions and links. |
| DEMO_LOGIN_ENABLED | optional | Enables demo login in non-production environments. |
| UPLOAD_PROVIDER | optional | local, S3, or R2. |
| EMAIL_SERVER | optional | SMTP connection string. |
| SENTRY_DSN | optional | Error monitoring. |
| AI_PROVIDER | optional | Reserved AI provider switch. |
| OPENAI_API_KEY | optional | Reserved AI key. |
| EXPORT_ENABLED | optional | Enables CSV export endpoints. |

Do not commit .env or .env.local.
