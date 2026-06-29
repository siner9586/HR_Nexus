# Stripe

## Dashboard 配置

1. 创建 Product：HR Nexus Standard、Professional、Enterprise。
2. 创建月付/年付 Price。
3. 将 Price ID 写入 .env。
4. 配置 Webhook: /api/billing/webhook。
5. 监听 checkout.session.completed、customer.subscription.created、customer.subscription.updated、customer.subscription.deleted、invoice.paid、invoice.payment_failed。

## 本地测试

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

将 CLI 输出的 whsec 写入 STRIPE_WEBHOOK_SECRET。

Webhook 在非 mock mode 下使用 stripe.webhooks.constructEvent 校验签名。
