# Operations

## Routine Checks

- Review AuditLog for sensitive access and exports.
- Review ExportJob for large or failed exports.
- Verify seed/demo users are disabled in production unless explicitly needed.
- Rotate secrets through deployment platform environment management.

## Data Handling

- Do not hard-delete enterprise HR data by default.
- Use archive/status transitions for operational cleanup.
- Exported CSV files should be treated as sensitive documents.
- Employee import errors should be reviewed before retrying.
