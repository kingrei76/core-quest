# dispatch-reminders

Cron-driven Edge Function that sends Web Push notifications for quests whose
`reminder_at` falls inside the last 5 minutes.

## Setup

1. Generate a VAPID key pair locally:
   ```
   npx web-push generate-vapid-keys
   ```
2. Set the public key in your app environment:
   ```
   # .env (frontend)
   VITE_VAPID_PUBLIC_KEY=<public key>
   ```
3. Set the secrets on Supabase:
   ```
   supabase secrets set VAPID_PUBLIC_KEY=<public key>
   supabase secrets set VAPID_PRIVATE_KEY=<private key>
   supabase secrets set VAPID_SUBJECT="mailto:you@example.com"
   ```
4. Deploy the function:
   ```
   supabase functions deploy dispatch-reminders
   ```
5. Schedule it (Supabase Dashboard → Database → Cron Jobs, or via SQL):
   ```sql
   select cron.schedule(
     'dispatch-reminders',
     '*/5 * * * *',
     $$
     select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/dispatch-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
       ),
       body := '{}'::jsonb
     ) as request_id;
     $$
   );
   ```

## Verification

1. In the app, enable notifications and confirm a row appears in
   `push_subscriptions`.
2. Create a quest with `reminder_at` set 6 minutes in the future.
3. Wait. On the next cron tick after the reminder time, you should receive
   a push. Background or close the PWA on iPhone first to confirm
   delivery works when the app isn't in the foreground.
