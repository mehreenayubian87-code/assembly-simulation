# Classroom authentication

The GitHub Pages frontend uses Supabase. Only the project URL and publishable key belong in dist/auth-config.js. Never add a secret or service-role key.

## Project configuration

1. Apply supabase/schema.sql once using SQL Editor. It creates four tables, row-level access policies and classroom functions.
2. Enable email and Anonymous Sign-Ins in Authentication. Anonymous student sessions still have unique authenticated user IDs; the shared class code does not grant access to other students' reports.
3. Set Site URL to https://mehreenayubian87-code.github.io/assembly-simulation/ and allow https://mehreenayubian87-code.github.io/assembly-simulation/index.html as a redirect.
4. Configure custom SMTP before inviting external professors. Supabase's default mail service restricts recipients and sending volume. See https://supabase.com/docs/guides/auth/auth-smtp.
5. For a public classroom rollout, configure Supabase bot protection with the corresponding frontend CAPTCHA integration and review anonymous signup rate limits for students sharing a university network. This prototype currently relies on provider rate limits and does not include a CAPTCHA widget. See https://supabase.com/docs/guides/auth/auth-anonymous.

## Assign the first professor

First sign in on the deployed website using the professor's email link. Then run the following in the project's SQL Editor, replacing the example with that exact verified email:

```sql
insert into public.assembly_roles(user_id,role)
select id,'professor' from auth.users
where lower(email)=lower('REPLACE_WITH_PROFESSOR_EMAIL')
  and email_confirmed_at is not null
  and is_anonymous is false
on conflict(user_id) do nothing;
```

Check that the query inserted one row (or that the existing role is correct), then reopen Account. Never grant this role based on a student-supplied browser field. The professor can create a class and share its 12-character invitation code. Closing joining prevents new membership; existing members retain access.

## Student flow and limits

- Students open Account and enter the classroom code without email or password.
- Each browser receives a distinct student session. Clearing browser data, signing out or switching devices loses access to that session. Download the PDF first. The professor retains already-submitted reports.
- Joining does not upload the current simulation or share previous private reports. At the end, choose Save agreement to my account, select the classroom and save.
- Shared-screen group work remains 2–5 students at one device. Classroom membership is a submission workspace, not synchronized multi-device negotiation.
- In-progress work remains in memory; refresh resets the simulation. Only explicitly saved final reports are stored. Reports are self-authored learning records, not verified grades.
- The project owner manages retention and deletion in Supabase. Do not collect sensitive health records in student reflections.

## Verification

`npm test` exercises PostgreSQL row-level access using PGlite and checks custom proposals and PDF reports. `npm run build:auth` bundles the pinned Supabase client. Full deployment acceptance additionally requires real professor email sign-in, professor assignment, class creation, student joining and a submitted report visible only to its owner and class professor.

## Classroom management update

After the base schema, run supabase/classroom-management.sql to enable reopening and deletion. Only the classroom owner can perform these actions. Reopening retains the existing code. Deletion removes the classroom and memberships, while reports remain private to their student owners; the professor loses access. The interface requires a separate explicit confirmation before deletion. Create class creates a new classroom with a new code.
