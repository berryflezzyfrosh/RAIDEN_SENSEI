# Owner account setup

1. Apply all migrations, including `20261019110000_0003_security_integrity.sql`.
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