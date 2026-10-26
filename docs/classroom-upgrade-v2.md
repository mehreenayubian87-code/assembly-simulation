# Classroom upgrade: professor-managed rooms

## One-time setup

Run the complete local `RUN-CLASSROOM-UPGRADE.sql` file in the existing Supabase project's SQL Editor. The file is in `../deliverables/classroom-upgrade/` relative to this repository. It includes the original room prerequisite, the v2 functions, four topic packets, 32 confidential role briefs, and a compatibility update for legacy rooms. It has been tested by executing it twice against a local PostgreSQL-compatible database.

The complete file and private scenario seed are intentionally outside the public repository and website. Keep them with the professor/project administrator. The public migration in this repository contains schema and permissions only, not the confidential content. Applying that migration alone will not populate the scenarios.

Existing classrooms and reports are retained. Existing room drafts and records are retained; old vaccine rooms receive the new private role brief collection. New rooms require at least four assigned student delegations to start. Rooms already in progress from an earlier release are retained as they are rather than resetting their work.

## Two choices for learners

- **Solo practice:** the existing voiced vaccine exercise plus self-directed preparation for each available topic. Topic preparation uses public background, an opening-statement exercise, an objection-and-response exercise and drafting practice. It does not reveal private live-room mandates or pretend to be live AI.
- **Live classroom practice:** rooms belonging to classrooms the student has joined. Each student uses a separate browser session/device and participates in the room assigned by the professor.

Account and audio controls remain utility controls. The shared-screen group option is removed from the main screen. Existing solo teaching tools remain within that exercise.

## Professor workflow

1. Create or reopen a classroom in Account and share its invite code.
2. Students join from their own devices and register a recognizable name or classroom alias in Live classroom practice.
3. Open Live classroom practice to see the multi-room dashboard. Filter by classroom if needed.
4. Create a room, choose its health issue, review all confidential role briefs, choose capacity (4–8 students), and set the duration (1–180 minutes).
5. Open the room and assign distinct students to delegation roles. The same student cannot occupy two roles in a room or be assigned to another active room in the same classroom.
6. Start the room from the dashboard or room controls once at least four students are assigned. The common server-timed countdown starts with the simulation.
7. Monitor phases, response counts, objections and time remaining across rooms. Pause, resume or extend a timer inside a room. Time expiry is a visible teaching signal; it does not fabricate consent or automatically end discussion.
8. Send an unexpected event directly to a selected room from the dashboard, or use topic-specific suggestions inside that room. Events during committee or plenary return the room to consultation and clear earlier responses.
9. Submit the shared draft for Committee A review and then plenary. Every assigned delegation must explicitly record no objection at each decision stage. The professor cannot cast a student's response.
10. Download the final policy report. It includes the shared resolution, discussion and unexpected events, but excludes confidential briefs.

## Student workflow and privacy

Students join with the classroom code, register their name/alias, and wait for the professor's assignment. Their role briefing appears automatically in the assigned room. It includes country context, priorities, constraints/red lines, evidence assumptions, authority, negotiating resources, possible concessions and tasks.

Only the assigned student and classroom professor receive that live-room brief from the server. Students cannot retrieve other roles by changing a browser control. Catalog responses to students exclude private role content and inject templates. Private tables have row-level security and no direct authenticated-user access; legacy RPC entry points are also revoked. The professor may view all role briefs. A student can still voluntarily reveal or copy their own brief; the platform cannot prevent that.

Written discussion, shared drafts and responses are visible to assigned room participants and the professor. The platform polls automatically for activity; unsent text is preserved and stale draft edits require review. Spoken discussion can happen in the physical classroom or an external meeting service. In-app voice/video calls are not included.

Keep the original browser session for anonymous student access. Losing that session can lose the assigned identity. Before starting, the professor can release/reassign seats. Roles are locked after starting; the existing account system has no anonymous identity recovery workflow.

## Topic sources and teaching assumptions

The issue selection is informed by WHO background material checked on 25–26 October 2026:

- Vaccine access and delivery: https://www.who.int/health-topics/vaccines-and-immunization
- Antimicrobial resistance, access and stewardship: https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance
- Climate-resilient health systems: https://www.who.int/news-room/fact-sheets/detail/climate-change-and-health
- Youth mental health and community care: https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response

WHO source pages supply background rather than fictional national mandates. All eight countries, constraints, concessions and unexpected events are authored classroom material, not real country positions or clinical guidance. The WHO-inspired committee/plenary workflow from the earlier release is retained. These features do not make the platform a validated digital twin.

## Verification and remaining acceptance check

Automated tests cover student/teacher separation, private catalog and brief access, revoked legacy routes, classroom isolation, professor-only assignment, duplicate-role prevention, minimum attendance, timers, inject isolation, stale draft/version checks and consensus transitions. The combined private setup file was executed twice locally and contained four topics with 32 briefs.

After setup in Supabase, conduct a professor-plus-four-student trial using separate browser sessions. Verify each assigned brief, send messages from two devices, revise a draft, start/pause/resume the clock, inject an event in one room, and confirm that another room does not receive it. Browser visual QA was unavailable in the agent environment. This production acceptance check is not claimed complete.


### Room-local student numbers
Apply `supabase/room-student-numbers.sql` after the classroom v2 setup. Existing assignments are preserved and numbered. This migration is safe to rerun.

Students use their class code, open the specific room named by the professor, and click **Join this room**. The server allocates a stable Student 1?8 number within that room's capacity. The student sees this number on their device. The professor refreshes the student list and assigns a distinct delegation to each numbered student. Empty slots are marked Not joined yet. Numbers restart in every room; account IDs are not displayed. A student cannot enroll in two active rooms of the same class. Existing minimum-four-student start rule remains in force.

Role release frees the role, not the student's numbered place. The private roster is available only to the room's owning professor. Students see only their own number and assigned briefing.

Apply manual-role-assignment.sql after room-student-numbers.sql to enable atomic professor-only role moves and clearing lobby assignments. Dropdowns show all capacity slots, mark unjoined places, and start at Choose a student; current saved assignments are displayed separately. Clearing assignments retains enrollment and numbering. No migration automatically assigns or clears roles.
