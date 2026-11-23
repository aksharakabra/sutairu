# Supabase setup for Sutairu (about 10 minutes)

Until you do this, the site runs in **demo mode**: it works, but memberships and closets only live in your own browser.

1. Go to supabase.com, sign in, and click **New project**. Pick any name and a database password (save it somewhere).
2. In the left menu open **SQL Editor**, click **New query**, paste everything from `supabase_setup.sql`, and click **Run**. You should see "Success".
3. Open **Authentication**, then **Sign In / Providers**, then **Email**. While you are building, turn **off** "Confirm email" so you can log in right after signing up. Turn it back on before launch.
4. Open **Project Settings**, then **API** (or the **Connect** button). Copy the **Project URL** and the **anon / publishable** key.
5. Open `config.js` in the site folder and paste them between the quotes. Never paste the `service_role` or secret key.
6. Open `join.html`, open a membership, then check Supabase, **Table Editor**, `closets`: you should see a row called "On hold".
7. Before launch: **Authentication**, **URL Configuration**, set the Site URL to your real website address.
8. Saved fitting-room looks: if you already ran `supabase_setup.sql` before Cluster 6, also run `supabase_add_outfits.sql` the same way (SQL Editor, New query, Run). Fresh projects only need `supabase_setup.sql`.
