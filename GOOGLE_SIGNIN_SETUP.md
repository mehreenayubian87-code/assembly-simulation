# Google sign-in for Assembly

No custom domain is needed for prototype testing. The website button is implemented, but Google credentials must be configured by the project owner.

1. Open https://console.cloud.google.com/ and create or select a project named Assembly Simulation.
2. Open Google Auth Platform. Complete Get started with app name Assembly Simulation, your support/contact email and External audience. For prototype testing, keep the audience in Testing and add your own Gmail as a test user. Add the professor as a test user before their trial.
3. In Data Access, use only openid, userinfo.email and userinfo.profile. No Gmail inbox access is needed.
4. In Clients, create an OAuth client with application type Web application. Set:
   - Authorized JavaScript origin: https://mehreenayubian87-code.github.io
   - Authorized redirect URI: https://kcdvzfpasofigxyldbiq.supabase.co/auth/v1/callback
5. Copy the Client ID and Client Secret directly into Supabase → Authentication → Sign In / Providers → Google. Enable Google and save. Do not put the Client Secret in the website, GitHub or chat.
6. Keep the existing Supabase redirect allowlist entry: https://mehreenayubian87-code.github.io/assembly-simulation/index.html
7. On the website, open Account → Sign in with Google. Use the same verified email as the existing professor account. After returning, reopen Account and verify your professor workspace and existing classroom are present. If not, check the Supabase user and role records before assigning any new role or deleting any account.

The Google screen may show the Supabase project hostname. The flow requests basic identity information only. Professor permissions still come from the database, not Google login alone. The frontend checks whether Google is enabled and shows a setup message when it is not.

Opening Google sign-in navigates away; download any completed report first. In-progress simulation state is not persisted. Student classroom-code access is unchanged.

Official setup guide: https://supabase.com/docs/guides/auth/social-login/auth-google
