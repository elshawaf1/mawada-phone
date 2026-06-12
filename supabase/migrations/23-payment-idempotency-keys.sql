-- 23-payment-idempotency-keys.sql
-- Prevents duplicate order/payment-intent creation by tracking idempotency keys.

CREATE TABLE IF NOT EXISTS public.payment_idempotency_keys (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  "key" text NOT NULL UNIQUE,
  "orderId" text NOT NULL,
  "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_idempotency_keys_key
  ON public.payment_idempotency_keys ("key");

CREATE INDEX IF NOT EXISTS idx_payment_idempotency_keys_user
  ON public.payment_idempotency_keys ("userId");

ALTER TABLE public.payment_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for service role only"
  ON public.payment_idempotency_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
