# Security Specification - Portal Terpadu SMKN 1 Tegalsari

## 1. Data Invariants
1. Only authenticated users can access the dashboard, list applications, and record access logs.
2. Regular users (`USER` role) cannot escalate their own role, deactivate accounts, modify application records, or read other users' private profile data.
3. Applications must have a valid name, category, and standard HTTP/HTTPS target URL.
4. Access logs are append-only audit records; ordinary users cannot alter or delete past log entries.
5. Bootstrapped super admin (`smknegeri1tegalsari@gmail.com`) and designated `SUPER_ADMIN` roles have administrative authority across all collections.

## 2. Dirty Dozen Attack Payloads
1. **Unauthenticated Read on /users**: Anonymous client requests all user records. Expected: PERMISSION_DENIED.
2. **Unauthenticated Read on /applications**: Anonymous client queries applications. Expected: PERMISSION_DENIED.
3. **Privilege Escalation on /users/{uid}**: Regular user attempts to update their own role from `USER` to `SUPER_ADMIN`. Expected: PERMISSION_DENIED.
4. **Account State Tampering**: Regular user attempts to set another user's `isActive` to false. Expected: PERMISSION_DENIED.
5. **Malicious Application Injection**: Regular user attempts to create a new application document with a phishing targetUrl. Expected: PERMISSION_DENIED.
6. **Log Deletion**: Attacker attempts to delete `/access_logs/{logId}` to erase evidence of suspicious activity. Expected: PERMISSION_DENIED.
7. **Log Tampering**: Attacker attempts to update `/access_logs/{logId}` to falsify user agent or timestamp. Expected: PERMISSION_DENIED.
8. **Oversized Field Poisoning**: Injecting a 2MB payload into the application name or user department. Expected: PERMISSION_DENIED.
9. **Invalid Target URL**: Submitting `javascript:alert(1)` or non-http URI schema in application targetUrl. Expected: PERMISSION_DENIED.
10. **Shadow Field Injection**: Adding arbitrary admin tokens or unauthorized properties to user documents. Expected: PERMISSION_DENIED.
11. **Settings Overwrite**: Regular user attempts to overwrite portal branding or trigger maintenance mode in `/settings/global`. Expected: PERMISSION_DENIED.
12. **Foreign User Profile Modification**: User A attempts to overwrite User B's profile document. Expected: PERMISSION_DENIED.
