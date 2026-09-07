# Medication scheduling regression checks

Run `npm test` and `npm run typecheck` from `mobile-app`.
The tests execute the actual TypeScript plan and notification modules with a fixed
local clock and an in-memory replacement for the Expo notification APIs. They do
not verify OS notification delivery, permissions, sound assets, or background
execution on a physical device.

The native app now shares calendar/cycle/duration calculations between the UI and
notification planning in `src/medicationPlan.ts`. Existing undated records are
assigned to the migration day; historical dates cannot be recovered from records
that never contained a date. Subsequent daily status transitions preserve dated
slot history without reducing stock again.

The notification planner uses date-specific requests for the next 30 days,
retaining at most 60 pending requests on iOS or 500 on Android (including reserved
space occupied by other requests). Repeated reminders consume this budget, so a
busy plan may cover fewer days. Settings shows the first uncovered time. The plan
is refreshed on launch, foreground, calendar-day change and plan/settings edits.
There is no background task to extend this horizon while the app remains closed.
Snoozes retain their original deadline across reconciliation; completing, removing
or pausing the associated dose removes them.

Before a device release, verify a second-slot snooze while the app is backgrounded,
confirming a notification across midnight, and a treatment's final/off day on both
Android and iOS. Metro bundle export is a compilation check, not a device test.
