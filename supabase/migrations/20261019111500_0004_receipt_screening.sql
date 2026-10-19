DROP FUNCTION IF EXISTS public.admin_list_payments(text);

CREATE FUNCTION public.admin_list_payments(p_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  amount numeric,
  transaction_reference text,
  status text,
  review_note text,
  created_at timestamptz,
  verified_at timestamptz,
  receipt_id uuid,
  storage_path text,
  file_name text,
  mime_type text,
  fraud_risk_score numeric,
  fraud_flags text[],
  ocr_text text,
  ocr_confidence numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id,
         p.user_id,
         p.amount,
         p.transaction_reference,
         p.status,
         p.review_note,
         p.created_at,
         p.verified_at,
         r.id AS receipt_id,
         r.storage_path,
         r.file_name,
         r.mime_type,
         r.fraud_risk_score,
         r.fraud_flags,
         r.ocr_text,
         r.ocr_confidence
  FROM public.payments p
  LEFT JOIN public.payment_receipts r ON r.payment_id = p.id
  WHERE public.is_current_user_admin()
    AND (p_status IS NULL OR p.status = p_status)
  ORDER BY p.created_at DESC;
$$;