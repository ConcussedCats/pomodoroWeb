# Core Flows Manual Regression Checklist

## Scope

Reusable manual regression checklist for the primary user flows that should be verified before demos, release candidates, and important dev deployments.

## Execution Metadata

- Date:
- Environment:
- Base URL:
- Browser:
- Tester:
- Build / commit:
- Overall result:

## Status Legend

- `PASS`
- `FAIL`
- `BLOCKED`
- `N/A`

## Preconditions

- Start in a clean browser session or incognito window.
- If possible, clear:
  - `pomodoroSettings`
  - `pomodoroTimerState`
  - `telos.productivity.v1`
- Use one anonymous session and, when available, one authenticated session.
- Verify the target environment URL before starting the run.

## Checklist

| ID | Area | Check | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| CF-01 | Deployment | Open the base URL in a fresh session. | The site loads successfully and the main shell renders without a blank screen or obvious layout break. |  |  |
| CF-02 | Home / Timer | Open `/` and verify the timer page shell. | Header, timer section, timer mode labels, time display, start button, reset button, and settings button are visible. |  |  |
| CF-03 | Timer | Click `Start`. | The timer enters running state, the visible countdown starts decreasing, and the start button changes to the running/pause state. |  |  |
| CF-04 | Timer | While running, click the pause control. | The timer stops decreasing, remains on the current mode, and reflects a paused state instead of continuing to run. |  |  |
| CF-05 | Timer | After start or pause, click `Reset`. | The timer returns to its default state, the default mode is restored, and the main display returns to the starting duration. |  |  |
| CF-06 | Timer / Persistence | Start the timer, wait a few seconds, then reload the page. | The timer restores from storage and does not lose the current session state. Running timers continue with updated remaining time; paused timers remain paused. |  |  |
| CF-07 | Timer / Navigation | Start or pause the timer on `/`, then navigate to another public page such as `/about` or `/productivity`. | Navigation works normally, the app shell remains intact, and timer-related state is not unexpectedly reset. |  |  |
| CF-08 | Mini Timer | On a non-home page, verify the mini timer visibility. | The mini timer is visible where expected, shows the current mode and time, and reflects ready/running/paused state consistently with the main timer. |  |  |
| CF-09 | Mini Timer / Navigation | Change timer state on `/`, then navigate between pages. | The mini timer remains in sync without requiring a manual browser refresh. |  |  |
| CF-10 | Productivity | Open `/productivity` in the target environment. | The page renders its primary UI variant correctly for the current auth state, without broken layout or blank content. |  |  |
| CF-11 | Productivity Tabs | If the tabbed productivity UI is available, switch between `To-do` and `Notes`. | Tabs switch within the same route, the active state updates correctly, and the matching content panel is shown. |  |  |
| CF-12 | Productivity Layout | While switching productivity tabs, watch the layout. | The page layout remains stable and controls do not overlap, jump unexpectedly, or disappear. |  |  |
| CF-13 | Login | Open `/login`. | The login page renders correctly with visible identifier field, password field, and submit button. |  |  |
| CF-14 | Login | If the environment supports it, attempt one invalid login. | The page stays in the login flow and shows a visible error state instead of a broken page or silent failure. |  |  |
| CF-15 | User / Profile | Open `/user` or the environment’s profile route using an authenticated session. | The user/profile page renders successfully and shows the expected profile sections instead of an error page or broken layout. |  |  |
| CF-16 | User / Profile | Inspect the profile page sections. | Profile data and password-change sections are visible and usable in the current UI. |  |  |
| CF-17 | Cross-page Shell | During the full pass, check header and footer consistency. | Header navigation, footer content, and shared layout remain consistent across the visited pages. |  |  |
| CF-18 | Browser Errors | During the full pass, watch for obvious runtime failures. | No critical browser-visible errors, raw exception pages, or blocking UI failures appear during the smoke path. |  |  |

## Recommended Execution Order

1. Base URL and home page shell
2. Timer start, pause, reset
3. Timer reload recovery
4. Cross-page navigation and mini timer
5. Productivity page and tab switching
6. Login page rendering
7. User/profile page rendering

## Failure Logging Notes

- For timer failures, record:
  - current mode
  - whether the timer was running or paused
  - whether the issue appeared before or after reload
- For productivity failures, record:
  - authenticated or anonymous state
  - whether the page showed tabs or a guest/login-required variant
- For login/profile failures, record:
  - route visited
  - visible error message
  - whether the issue is reproducible in a fresh session

## Related Detailed Plans

- [../index/04-timer-controls-start-pause-reset.md](../index/04-timer-controls-start-pause-reset.md)
- [../mini-timer-scripts/02-mini-timer-runtime-contract.md](../mini-timer-scripts/02-mini-timer-runtime-contract.md)
- [../productivity/01-page-shell-and-tabs.md](../productivity/01-page-shell-and-tabs.md)
- [../login/README.md](../login/README.md)
- [../user/README.md](../user/README.md)
