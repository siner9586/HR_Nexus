# Testing

## Unit

```bash
npm run test
```

覆盖 permissions、masking、tenant、payroll、workflow、export。

## Smoke

启动 dev server 后：

```bash
npm run smoke
```

覆盖登录、me、员工、合同、dashboard 和核心模块 API。

## E2E

```bash
npm run test:e2e
```

覆盖登录、Dashboard、员工、权限差异和主要页面入口。

## Postman

导入 docs/postman 文件，先登录保存 token，再运行 Collection。
