# Prepared classrooms and professor-approved access

Apply the supplied PREPARED-CLASSROOMS.sql in the existing Supabase project after the earlier classroom upgrades. The migration is additive and rerunnable; previous rooms remain accessible through Open earlier classrooms.

## Professor

1. Sign in with the approved professor account. Open Live classroom practice.
2. Create a teaching session (the shared main lobby for all participating classrooms).
3. Prepare each classroom: title, health issue, 4?8 student names, and a different role for each. No role is selected automatically. Names within a room must be distinct; include an identifier for students with identical names.
4. Share the classroom's room code with that group and tell students the exact prepared names. Do not use the old cohort/class code for prepared rooms.
5. Verify each entry request in person or through an agreed communication channel, then approve it in the session lobby. Approval binds the role to that browser's authenticated session. Reject unexpected requests.
6. Start the 10-minute prebrief. When every prepared participant has joined, advance to 20-minute negotiation. Follow with 15-minute report writing and 15-minute debrief. The professor chooses when to advance; expiry never invents agreement or automatically discards work. Stage start/end times are retained by the database.
7. Visit classrooms to read discussion and send room messages/events. Main-lobby announcements are visible in every room. Use Return to main lobby to return from a classroom.

## Students

Choose Student on the sign-in page. Enter the shared room code and your exact prepared name. Keep the page/browser session open while awaiting professor approval. No email or separate access code is required. Reloading the page resumes approval polling. Once approved, open Live classroom practice and your teaching session, then open your classroom.

Participants see names and role names in their room. Only the assigned participant and professor receive a private role brief. A shared code and claimed name do not verify identity on their own: professor approval is required. Keep the same browser; anonymous identity recovery across devices is not provided in this release.

During report writing, save a shared report. Concurrent edits use version checking rather than overwriting a classmate's newer text. Load latest report and merge changes when needed. Download the report from the classroom; drafts are labelled as unadopted unless formal adoption was recorded. Reports exclude private briefs.

Click Enable bell sound in the lobby to allow audio on that device. A visible elapsed-time alert also appears. Background tabs or suspended devices can delay browser timers and sounds; server timestamps remain the authority. The professor controls stage transitions.

## Current limits and verification

This release provides text discussion, announcements, private briefs, session timing and report writing. It does not provide video calls, microphone communication or screen sharing. A conferencing integration is still required for the requested all-in-one remote experience. The named roster cannot currently be edited after saving; prepare it carefully. Existing rooms and prior work are retained.

Automated database tests cover approval, rejection, duplicate claims, no brief before approval, room isolation, blocked legacy bypasses, professor ownership, stage timing, and stale report saves. Browser visual review and a real professor-plus-students trial remain necessary after applying the migration.
