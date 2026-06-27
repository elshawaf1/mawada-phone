-- Saved cards table for Paymob tokenized card storage
-- Users can save card tokens for faster checkout

CREATE TABLE IF NOT EXISTS saved_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  "maskedPan" TEXT NOT NULL,
  "cardToken" TEXT NOT NULL,
  "cardType" TEXT NOT NULL DEFAULT 'VISA',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_saved_cards_user ON saved_cards("userId");

-- Unique constraint: one token per card per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_cards_token_user ON saved_cards("cardToken", "userId");

-- RLS policies
ALTER TABLE saved_cards ENABLE ROW LEVEL SECURITY;

-- Users can read their own saved cards
CREATE POLICY "Users can view own saved cards"
  ON saved_cards FOR SELECT
  USING (auth.uid() = "userId");

-- Users can insert their own saved cards
CREATE POLICY "Users can insert own saved cards"
  ON saved_cards FOR INSERT
  WITH CHECK (auth.uid() = "userId");

-- Users can delete their own saved cards
CREATE POLICY "Users can delete own saved cards"
  ON saved_cards FOR DELETE
  USING (auth.uid() = "userId");

-- Users can update their own saved cards (e.g., set default)
CREATE POLICY "Users can update own saved cards"
  ON saved_cards FOR UPDATE
  USING (auth.uid() = "userId");
