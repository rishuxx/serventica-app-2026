# SERVENTICA — Role-Based Access Control & User Roles

| Role Name | Scope | Key Permissions |
| :--- | :--- | :--- |
| `CUSTOMER` | Customer Mobile App | `catalog.read`, `cart.manage`, `booking.create`, `booking.cancel_own`, `review.create` |
| `PARTNER` | Partner Mobile App | `job.receive`, `job.accept`, `job.update_status`, `earnings.read`, `availability.set` |
| `OPERATIONS_AGENT` | Admin Web | `booking.reassign`, `booking.view_live`, `dispatch.override`, `support.resolve_ticket` |
| `PARTNER_MANAGER` | Admin Web | `partner.verify_kyc`, `partner.approve`, `partner.suspend` |
| `FINANCE` | Admin Web | `payout.process`, `refund.approve`, `ledger.export` |
| `CONTENT_MANAGER` | Admin Web | `category.manage`, `service.manage`, `pricing.update_draft` |
| `ADMIN` / `SUPER_ADMIN` | Admin Web | System-wide configuration, audit logs, role grants |
