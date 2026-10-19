# Owner account setup

1. Apply all migrations, including `20261019110000_0003_security_integrity.sql` and `20261019111500_0004_receipt_screening.sql`.
2. Generate a unique random bootstrap token of at least 32 characters and set it as a Supabase Edge Function secret:

   ```powershell
   supabase secrets set OWNER_BOOTSTRAP_SECRET=<random-token>
   ```

3. Deploy the `owner-auth` function and open the site's Owner Access page.
4. Choose first-run setup. Enter the same bootstrap token, choose an owner secret of at least 20 characters, then create the admin account.
5. Remove the one-time bootstrap token from Supabase after the admin account is created:

   ```powershell
   supabase secrets unset OWNER_BOOTSTRAP_SECRET
   ```

The owner secret is required for future admin logins. Do not use the bootstrap token as the owner secret. The bootstrap endpoint remains disabled unless the server token is configured.

## Receipt screening

Receipt OCR uses Google Cloud Vision. Enable the Vision API and configure its API key as an Edge Function secret:

```powershell
supabase secrets set GOOGLE_VISION_API_KEY=<google-cloud-vision-api-key>
supabase functions deploy receipt-review
```

The function checks extracted text for the entered amount, transaction reference, and configured account number. It stores OCR text, provider confidence, a heuristic risk score, and mismatch flags for admin review. PDFs, unreadable images, and provider failures stay in manual review. These checks do not establish that money was actually received and do not reliably detect AI-generated or edited images. Admin verification must be based on independent payment confirmation; never treat a clean OCR result as proof of payment.