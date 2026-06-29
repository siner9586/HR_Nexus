# File Storage

`UPLOAD_PROVIDER=local` is acceptable for local demo only. It is not durable on Vercel serverless because local filesystem writes do not persist across deployments or function instances.

Production choices:

- Cloudflare R2
- AWS S3 compatible storage
- MinIO for private deployment

Cloudflare R2 attempt on 2026-06-29 failed with: R2 must be enabled in the Cloudflare Dashboard first.

Do not keep retrying R2 bucket creation from automation until R2 is enabled in the account. Production can launch without durable uploads as long as customer file uploads remain disabled or clearly marked unavailable.

Required R2 variables:

```text
UPLOAD_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=hr-nexus-assets
```

Security requirements:

- downloads must require `files.download` or `files.download_sensitive`
- sensitive downloads must write `AuditLog`
- signed URLs should expire quickly
- never expose raw bucket credentials to the browser

Next step: enable R2 in Cloudflare Dashboard, create the bucket, then set the variables in Vercel without committing credentials.
