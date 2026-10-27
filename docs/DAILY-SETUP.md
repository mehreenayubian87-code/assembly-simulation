# Deploy classroom conferencing

1. In the existing Supabase project, open Edge Functions and deploy a new function using the editor.
2. Name it `classroom-call` and replace index.ts with `supabase/functions/classroom-call/index.ts` from this repository.
3. Confirm the `DAILY_API_KEY` secret is present. Do not paste it into the source or GitHub.
4. If the gateway rejects valid sign-ins with Invalid JWT, disable the function gateway's legacy JWT verification. This function verifies each bearer token itself through Supabase Auth, then calls database RPCs using that user's token; it never uses a service-role key.
5. Deploy, then test in a disposable teaching session using independent professor and student browsers.

Calls open only during prebrief, negotiation, report and debrief. Prebrief/debrief use a common lobby. Negotiation/report use assigned classrooms. A stage change disconnects the embedded call and asks participants to join the next stage. Camera/microphone start off. Screen sharing uses the browser's permission prompt. No recording is enabled by this integration.

Access is verified server-side before room-specific tokens are issued. Tokens expire after one hour and eject at expiry. The website checks stage/access every five seconds; already issued tokens are not immediately revoked server-side when a session ends. Do not claim immediate server-enforced removal. Before larger deployment, add server-side stage-change ejection, service usage limits, and an end-to-end remote-device acceptance test.

Live service deployment, real devices, screen sharing and group audio have not been tested by the coding environment. A stored secret alone does not make the service live.
