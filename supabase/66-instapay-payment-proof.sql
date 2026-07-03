-- Add payment proof columns to orders
ALTER TABLE orders ADD COLUMN "paymentProofUrl" text;
ALTER TABLE orders ADD COLUMN "paymentProofStatus" text DEFAULT 'NONE'
  CHECK ("paymentProofStatus" IN ('NONE','PENDING','APPROVED','REJECTED'));

-- Create storage bucket for payment proof images (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proof-images', 'payment-proof-images', false);

-- Storage policies
CREATE POLICY "Users can upload proof" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proof-images');

CREATE POLICY "Admin can view proofs" ON storage.objects
  FOR SELECT TO service_role
  USING (bucket_id = 'payment-proof-images');

CREATE POLICY "Admin can delete proofs" ON storage.objects
  FOR DELETE TO service_role
  USING (bucket_id = 'payment-proof-images');
