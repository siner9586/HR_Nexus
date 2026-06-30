# Exports

`lib/export.ts` standardizes CSV exports:

- UTF-8 BOM for Excel-compatible Chinese text.
- Chinese field headers.
- Date and money formatting.
- Sensitive field masking based on permissions.
- Filtered exports using current query parameters.
- Selected employee export using ids query parameter.
- AuditLog records for export events.
- ExportJob records for key modules.
- Filename format: hr-nexus-{module}-yyyyMMdd-HHmmss.csv.

Employee import supports CSV through `POST /api/employees/import` and returns imported, failed and errors.
