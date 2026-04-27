# import-from-device

Edge Function that accepts batched items from an iPhone (or any client with the
import token) and inserts them into `inbox_items` for review. Dedupes by
`(user_id, external_source, external_id)`.

## Setup

1. Run the SQL block titled "DEVICE IMPORT" in `supabase-schema.sql` (adds the
   `external_id`, `external_source`, `metadata` columns and the
   `device_import_tokens` table).
2. Deploy:
   ```
   supabase functions deploy import-from-device
   ```
   No additional secrets required — this function uses the standard
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` that Supabase auto-provides.
3. In the app, sign in and go to **Character → Import from iPhone**, generate a
   token, and copy it.

## Endpoint

```
POST https://<PROJECT_REF>.supabase.co/functions/v1/import-from-device
Authorization: Bearer cq_xxxxxxxxxx
Content-Type: application/json

{
  "items": [
    {
      "external_id": "x-coredata://...REMINDER_UUID",
      "external_source": "ios_reminders",
      "content": "Pick up dry cleaning",
      "due_date": "2026-04-29",
      "metadata": { "list": "Personal" }
    }
  ]
}
```

Response:
```json
{ "inserted": 1, "skipped": 0 }
```

## iOS Shortcut recipe

The app's Character → Import from iPhone panel walks through the same steps in
the UI. Reproduced here for reference:

1. **Find Reminders where** "Is Completed" is "false". Limit 50.
2. **Repeat with Each** reminder. Inside the loop, build a Dictionary:
   - `external_id` ← Reminder Identifier
   - `external_source` ← `ios_reminders`
   - `content` ← Reminder Title
   - `due_date` ← Reminder Due Date formatted as `yyyy-MM-dd`
3. After the loop, wrap the collected dictionaries in another Dictionary
   under the key `items`.
4. **Get Contents of URL**:
   - Method: POST
   - URL: your endpoint
   - Headers: `Authorization: Bearer YOUR_TOKEN`, `Content-Type: application/json`
   - Request Body: JSON, file = the dictionary from step 3
5. (Optional) **Show Result** to verify `inserted` count.

Schedule it via Personal Automations (Time of Day, repeat every hour) or run
from the share sheet on demand.

## Why dedupe by external_id?

So you can run the Shortcut on a schedule without spamming the inbox. Apple
Reminder identifiers are stable, so if a reminder is still incomplete when the
Shortcut next runs, the duplicate insert is silently ignored.
