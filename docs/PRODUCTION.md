# Production

## Current Mode

HR Nexus 当前按企业内部部署和项目化交付运行。生产环境需配置数据库、会话密钥、应用地址、上传、邮件、观测和必要的第三方集成。

## Release Checks

- npm run typecheck
- npm run lint
- npm run test
- npm run build
- npx prisma validate
- npx prisma generate
- npm run smoke

## Operational Notes

- 导出会写 AuditLog，关键导出写 ExportJob。
- 员工导入支持 CSV 基础字段，失败行会返回 errors。
- 默认删除策略为软归档或状态变更。
- 薪资、证件、手机、银行卡等敏感字段按权限脱敏。
