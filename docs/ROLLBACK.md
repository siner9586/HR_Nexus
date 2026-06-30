# Rollback

## Git

```bash
git switch main
git revert <commit>
git push origin main
```

## Database

Prefer forward fixes. If a database rollback is required, restore from database backup or point-in-time recovery and record the incident in AuditLog or operations notes.

## Application

Redeploy the last known good commit from the deployment platform. Validate login, employee list, exports and smoke tests after rollback.
