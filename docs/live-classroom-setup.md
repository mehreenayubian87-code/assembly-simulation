# Live classroom setup

## One-time database update

In the existing Supabase project `kcdvzfpasofigxyldbiq`, open SQL Editor, create a new query, paste the entire contents of `supabase/live-rooms.sql`, and Run. The script adds the room table and authenticated functions. It is safe to run again and does not delete existing data. No provider keys or AI accounts are needed. Do not run the original schema.sql again.

The site cannot create shared rooms until this step completes. Existing solo and shared-screen activities still work.

## Professor

1. Sign in with the approved professor account and create or reopen a classroom as before.
2. Open **Live classroom** in the assembly header. Select your classroom and create a named negotiation room.
3. Share the existing classroom invite code with students. Students use that code on the welcome page from their own browsers, then open **Live classroom** and your room.
4. Wait for at least two students to take different delegation seats. There are four country seats per room; the professor is the Chair. Use several rooms for larger classes.
5. Open informal consultation. Students send messages and circulate revised text. Read the room record and guide discussion.
6. Submit to Committee A. Every seated student must explicitly record no objection before you can send the recommendation to plenary. An objection blocks that transition. Return to consultation to revise the draft if necessary.
7. In plenary, every student records a new position. Confirm final adoption only after all have recorded no objection.
8. Everyone in the room can download the adopted resolution and full discussion record as a PDF.

## Students

Use a separate device/browser session for each participant. Join with the class code, open the named live room, choose an available country, and read the briefing. Type a statement, question or offer and send it. Discuss before changing the draft. During committee and plenary review, select no objection or object; include an explanation if useful.

Do not share the same anonymous browser session between students on different seats. Refreshing the page retains the existing browser sign-in, but signing out or clearing browser storage can lose an anonymous student identity. A professor may release a seat in the lobby so that a replacement student can join. After consultation starts, seats are locked; create another room if an identity is lost.

## What is synchronized

Seats, shared resolution, draft versions, messages, phase and recorded positions are stored in Supabase. The client checks for updates every four seconds and offers **Load updates**, preserving unsent text. Old drafts cannot silently overwrite newer room activity. If a local draft differs from the current shared draft, compare them before circulating it.

The live classroom is a separate activity inside the same audiovisual application. The camera and prerecorded solo narration are not synchronized across devices. Live rooms have no AI delegates and no scripted votes for empty seats. Human students discuss free-text recommendations; numeric solo-scenario mandate thresholds are not enforced in live rooms. This is a consensus-based educational workflow, not every formal WHO procedure.

## Data and permissions

Only classroom members can list its rooms. Only seated participants and the classroom professor can read room discussion and drafts. Members cannot directly read or modify the room table; authenticated server functions enforce access. Students cannot create rooms for other classes, impersonate another delegation or advance phases. A single account cannot take two seats in one room. Adopted rooms are read-only.

Sent material is shared with the room and professor, unlike an unsaved solo draft. The room persists in the database; the PDF download is the portable final record. Deleting the whole classroom deletes its live rooms, so export needed reports first. Existing solo reports continue to use their original privacy and retention behavior.

## Validation

Automated database tests cover classroom isolation, professor restrictions, duplicate seats, stale drafts, draft-version and phase checks on responses, blocked adoption when any response is missing or an objection remains, fresh responses in plenary, and read-only adopted rooms. Live multi-device acceptance testing must follow applying the migration; it cannot be completed against the existing database before that step.
