# Paymob Integration Plan

> Generated: 2026-06-27T01:13:42.468Z | App v3.0.0

## Prompt — Copy and Paste This Into Your AI Agent

You are a Paymob integration assistant. I am a Developer / Technical Integrator integrating Paymob payments for Egypt using React Native SDK with the following optional features: Digital Wallets, BNPL & Installments, Subscriptions, Manage Payments (Refund/Void/Capture), Pay with Saved Cards, Callbacks & HMAC, Split & Convenience Fees.

I have an integration roadmap below with 4 stages. My current focus is: "Your Integration Path".

Please help me complete this integration step by step. For every unchecked task, tell me:
1. Exactly what to do and in which order.
2. Which Paymob Dashboard settings, API keys, or credentials are involved.
3. What code or configuration I need to add — tailored to my platform and stack above.
4. How to verify the task is done correctly (test, log, or dashboard check).

Rules you must follow:
- Only suggest payment methods and features documented for Egypt. Do not assume features are available if they are not listed in this file.
- Use the official Paymob doc links already included in the roadmap below — do not invent URLs.
- Respect the roadmap order unless a dependency forces a different sequence.
- Start with the earliest stage that still has unchecked tasks.

---

## Configuration
- Role: Developer / Technical Integrator
- Country: Egypt
- Integration Summary: React Native SDK
- Integration Status: New integration
- Account Readiness: No Paymob account yet
- Payment Flow: One-time checkout
- Launch Target: Sandbox only
- Dashboard Login: https://eg.dashboard.paymob.com/login/
- Paymob Docs: https://developers.paymob.com/paymob-docs
- Mobile SDK: React Native
- Selected Features: Digital Wallets, BNPL & Installments, Subscriptions, Manage Payments (Refund/Void/Capture), Pay with Saved Cards, Callbacks & HMAC, Split & Convenience Fees

## Progress Snapshot
- Current Step: 1 of 4
- Completed Stages: 0 of 4
- Overall Progress: 0%
- Current Focus: Step 1 - Your Integration Path

## Roadmap
### Step 1: Your Integration Path
Progress: 0/12 tasks completed (0%)

- [ ] Open the Egypt Paymob Dashboard from the wizard Open Dashboard
- [ ] Sign up or log in to the Paymob Dashboard for Egypt Open Dashboard
- [ ] Retrieve Secret Key, Public Key, API Key, HMAC Secret, and Integration IDs API Keys Docs Preview
- [ ] Create or sync payment integrations for the methods you will launch Payment Integrations Docs Preview
- [ ] Retrieve your Moto Integration ID — required for subscriptions and backend saved-card charges Payment Integrations Docs Preview
- [ ] Install React Native SDKDocs Preview
- [ ] Build the backend Create Intention endpoint with your Secret KeyDocs Preview
- [ ] Configure the Egypt SDK response callback URL and keep backend callbacks as the source of truth Docs Preview
- [ ] Prepare a public HTTPS webhook URL — use [hooks.paymob.com](https://hooks.paymob.com) for sandbox testing before deploying a real endpoint Webhook docsDocs Preview
- [ ] Make a sandbox payment using test credentials — run success, decline, and 3DS card flowsDocs Preview
- [ ] Open Transactions in your dashboard and confirm your test payment appears as the top row Transactions Docs Preview
- [ ] Verify HMAC SHA-512 on every callback before trusting payment status. Sort the 20 standard fields lexicographically, concatenate values, hash with your HMAC secret, compare to the hmac field.
              Source of truth: Treat the backend Transaction Processed POST callback as authoritative — not the SDK response GET, not the browser redirect.
              
                What to watch for
                
                  Field spelling: error_occured (one 'r' — that's the canonical API field name, do not "correct" it).
                  POST vs GET key names: POST callback uses obj.id and order.id; GET redirect uses id and order_id.
                  Test before deploying: use hooks.paymob.com to capture sandbox callbacks.
                  Idempotency: dedupe handlers by transaction id — Paymob may retry.
                
                Full HMAC docs ↗

### Step 2: First Test Transaction
Progress: 0/0 tasks completed (0%)


### Step 3: Expand Your Integration
Progress: 0/16 tasks completed (0%)

- [ ] Apple Pay configurationDocs Preview
- [ ] Local wallet requirementsDocs Preview
- [ ] Google Pay is not documented for Egypt; avoid planning it unless Paymob confirms availability
- [ ] [BNPL overview — region-specific providers](https://developers.paymob.com/paymob-docs/payments-and-features/payment-methods/bnpls-egy-ksa-uae)
- [ ] [Bank installments setup (Egypt only)](https://developers.paymob.com/paymob-docs/payments-and-features/payment-methods/bank-installments-egy)
- [ ] Generate an Auth Token before using Subscription APIsDocs Preview
- [ ] Create subscription plans and enrollment flowsDocs Preview
- [ ] Validate subscription callback HMAC and renewal trigger typesDocs Preview
- [ ] Implement refund flow and partial refund handlingDocs Preview
- [ ] Document void rules for same-day unsettled card transactionsDocs Preview
- [ ] Document capture rules for Auth/Capture transactionsDocs Preview
- [ ] Enable card token creation for saved-card paymentsDocs Preview
- [ ] Let customers choose a saved card at checkoutDocs Preview
- [ ] Run backend-only saved-card charges with the required Moto Integration IDDocs Preview
- [ ] Implement split payment / split amount in intentionsDocs Preview Split Settings
- [ ] Confirm convenience-fee rules before adding customer-facing surchargesDocs Preview

### Step 4: Go Live
Progress: 0/2 tasks completed (0%)

- [ ] Complete merchant verification, paperwork validation, and business profile readiness Business Profile
- [ ] Configure business branding, contact details, notification preferences, and profile fields Account Settings Docs Preview
