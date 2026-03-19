# GoodGame — Test Plan

> One section per build phase. Each test has a **precondition**, **steps**, and **expected result**.
> Run all tests in a development build on a physical device unless marked `[web ok]`.
> Use two test accounts (User A and User B) for any multi-user flows.

---

## Test Accounts

| Handle | Email | Password | Role |
|--------|-------|----------|------|
| User A | testa@runit.dev | TestA123! | Primary tester |
| User B | testb@runit.dev | TestB123! | Opponent |
| Admin | admin@runit.dev | Admin123! | Admin operations |

---

## Phase 0 — Project Setup

### P0-1: App boots to Auth screen `[web ok]`
- **Pre:** dev server running (`npx expo start --web`)
- **Steps:** Open app
- **Expected:** Dark `#0e1015` background, RUNIT wordmark, tagline "Wager with your friends. Settle with receipts."

### P0-2: Firebase env vars loaded `[web ok]`
- **Pre:** `.env` populated
- **Steps:** Open browser console, check for Firebase init errors
- **Expected:** No `MISSING_OR_INSUFFICIENT_PERMISSIONS` or `API_KEY_INVALID` errors

### P0-3: Navigation shell renders `[web ok]`
- **Pre:** Change `isAuthenticated = true` in `src/navigation/index.tsx`
- **Steps:** Open app
- **Expected:** Bottom tab bar visible with ⚡ Home, 📋 Wagers, purple FAB, 💬 Chat, 👤 Profile

### P0-4: Tab navigation `[web ok]`
- **Pre:** P0-3 passing
- **Steps:** Tap each tab
- **Expected:** Each screen renders its placeholder label; active tab icon turns purple (`#8b5cf6`)

### P0-5: FAB opens New Post `[web ok]`
- **Pre:** P0-3 passing
- **Steps:** Tap the purple "+" FAB
- **Expected:** New Post screen opens

---

## Phase 1 — Auth & User Model

### P1-1: Sign Up — happy path
- **Pre:** User A does not exist in Firebase Auth
- **Steps:** Enter `testa@runit.dev` + `TestA123!`, tap Sign Up
- **Expected:** Navigates to Home screen; Firebase Auth shows user created

### P1-2: Firestore user doc created on sign up
- **Pre:** P1-1 complete
- **Steps:** Check Firestore console → `/users/{uid}`
- **Expected:** Doc exists with `displayName`, `walletBalance: 0`, `wins: 0`, `losses: 0`, `currentStreak: 0`, `statsVisibility: "private"`, `createdAt` timestamp

### P1-3: Sign Up — duplicate email
- **Pre:** User A already exists
- **Steps:** Attempt sign up with `testa@runit.dev`
- **Expected:** Error message: "An account with this email already exists"

### P1-4: Sign Up — weak password
- **Pre:** Fresh sign up form
- **Steps:** Enter valid email + password `abc` (< 6 chars), tap Sign Up
- **Expected:** Error message: "Password must be at least 6 characters"

### P1-5: Sign Up — empty fields
- **Pre:** Fresh sign up form
- **Steps:** Tap Sign Up with empty fields
- **Expected:** Inline error on both email and password fields; no network call made

### P1-6: Log In — happy path
- **Pre:** User A exists
- **Steps:** Switch to Log In, enter correct credentials, tap Log In
- **Expected:** Navigates to Home screen

### P1-7: Log In — wrong password
- **Pre:** User A exists
- **Steps:** Enter correct email + wrong password, tap Log In
- **Expected:** Error message: "Incorrect email or password"

### P1-8: Auth state persists across restart
- **Pre:** User A signed in
- **Steps:** Force-close app, reopen
- **Expected:** App opens directly to Home screen (no auth screen shown)

### P1-9: Sign out navigates to Auth
- **Pre:** User A signed in
- **Steps:** Sign out (via profile or dev button)
- **Expected:** Auth screen shown; protected screens inaccessible

### P1-10: CometChat user created on sign up
- **Pre:** New user signs up
- **Steps:** Check CometChat dashboard → Users
- **Expected:** User entry exists with UID matching Firebase Auth UID

### P1-11: Skip link (dev mode)
- **Pre:** On Auth screen
- **Steps:** Tap "Skip"
- **Expected:** Navigates to Home screen as mock user JK; no Firebase auth call

---

## Phase 2 — Admin Interface

### P2-1: Triple-tap reveals Admin screen
- **Pre:** Signed in, on any screen with RUNIT wordmark
- **Steps:** Tap RUNIT wordmark three times quickly
- **Expected:** Admin screen opens; bottom tab bar hidden

### P2-2: Triple-tap does NOT trigger on two taps
- **Pre:** On home screen
- **Steps:** Tap RUNIT wordmark twice
- **Expected:** Admin screen does NOT open

### P2-3: Users list populates
- **Pre:** At least 2 users signed up (User A, User B)
- **Steps:** Open Admin screen
- **Expected:** Both users listed with display name + wallet balance

### P2-4: Fund injection — happy path
- **Pre:** User A has `walletBalance: 0`
- **Steps:** Tap User A → enter `$50` in fund sheet → confirm
- **Expected:** User A balance updates to `$50` in list and in Firestore

### P2-5: Fund injection is atomic (Firestore transaction)
- **Pre:** User A has `walletBalance: 25`
- **Steps:** Inject `$25`
- **Expected:** Balance becomes `$50`; no intermediate value possible (verify via Firestore console — single write, no two-step update)

### P2-6: Deposit doc written to subcollection
- **Pre:** After P2-4
- **Steps:** Check Firestore → `/users/{uid}/deposits/`
- **Expected:** Deposit doc with `amount: 50`, `method: "admin_injection"`, `currency: "CAD"`, `balanceBefore: 0`, `balanceAfter: 50`, `addedBy: {adminUid}`, `status: "completed"`, `createdAt` timestamp

### P2-7: Transaction Log shows deposit history
- **Pre:** Two deposits made to User A
- **Steps:** Open Transaction Log section in Admin
- **Expected:** Both deposits listed with amount, method, date; ordered newest first

### P2-8: Admin screen not reachable via bottom nav
- **Pre:** Signed in
- **Steps:** Inspect bottom tab navigator; attempt direct navigation to "Admin" route
- **Expected:** No Admin tab visible; no nav item; direct navigation fails

---

## Phase 3 — Core Wager Engine + Wager Screens

### P3-1: New Wager — opponent selector shows friends
- **Pre:** User A and User B are friends / share a wager
- **Steps:** Open New Wager screen
- **Expected:** Horizontal scroll shows User B avatar + initials fallback for unknown users

### P3-2: New Wager — category pills
- **Pre:** New Wager screen open
- **Steps:** Tap "Sports", then "Custom"
- **Expected:** Active pill shows inset neomorphic style; only one active at a time

### P3-3: New Wager — live preview card
- **Pre:** New Wager screen open
- **Steps:** Fill in opponent, category, description, amount, settle-by
- **Expected:** Preview card at bottom updates in real time with all entered values

### P3-4: New Wager — insufficient balance validation
- **Pre:** User A has `walletBalance: 10`
- **Steps:** Select amount `$25`, tap Submit
- **Expected:** Error: "Insufficient balance"; wager NOT written to Firestore; balance unchanged

### P3-5: New Wager — submit writes Firestore doc + deducts balance
- **Pre:** User A has `walletBalance: 50`, User B selected
- **Steps:** Fill form with `$25` wager, tap Submit
- **Expected:**
  - Firestore `/wagers/{id}` created: `creatorId`, `opp`, `amount: 25`, `status: "pending"`, `expiresAt`, `createdAt`
  - User A `walletBalance` → `25` (atomic)
  - Navigates to chat for this wager

### P3-6: Wager Dashboard — Pending tab shows new wager
- **Pre:** P3-5 complete; on User A's device
- **Steps:** Open Wagers tab → Pending
- **Expected:** Wager card shown with opponent name, description, amount, "Settle by" text

### P3-7: Wager challenge appears for opponent
- **Pre:** P3-5 complete; on User B's device
- **Steps:** Open Wagers tab → Pending
- **Expected:** Pending challenge card shown with creator name, description, amount, Accept + Decline buttons

### P3-8: Accept wager — happy path
- **Pre:** User B has `walletBalance: 50`; P3-5 wager exists
- **Steps:** User B taps Accept
- **Expected:**
  - User B `walletBalance` → `25` (deducted atomically)
  - Wager `status` → `"active"`
  - Wager moves from Pending → Active tab on both devices

### P3-9: Accept wager — insufficient balance
- **Pre:** User B has `walletBalance: 10`; wager amount is `$25`
- **Steps:** User B taps Accept
- **Expected:** Error: "Insufficient balance to accept this wager"; status unchanged

### P3-10: Decline wager
- **Pre:** Active pending wager; User A wagered `$25`
- **Steps:** User B taps Decline
- **Expected:**
  - User A `walletBalance` restored by `$25` (atomic)
  - Wager `status` → `"declined"`
  - Wager disappears from Pending on both devices

### P3-11: Active wagers tab
- **Pre:** Wager accepted (status: active)
- **Steps:** Open Wagers tab → Active
- **Expected:** Wager card shown with opponent name, description, amount, "Live" badge

### P3-12: Settle wager — winner selected correctly
- **Pre:** Active wager (`$25` each side = `$50` pot); User A created
- **Steps:** Open settle sheet in chat, select User A as winner, confirm
- **Expected:**
  - User A `walletBalance` increases by `50` (full pot)
  - User A `wins` +1, `currentStreak` +1
  - User B `losses` +1, `currentStreak` reset to 0
  - Wager `status` → `"settled"`, `winnerId` set, `settledAt` set
  - All updates in single Firestore transaction (no partial state)

### P3-13: H2H doc upserted after settlement
- **Pre:** P3-12 complete
- **Steps:** Check Firestore → `/h2h/{sortedUidPair}`
- **Expected:** Doc exists with `aWins` or `bWins` incremented, `totalWagers` +1

### P3-14: Settled wager in Settled tab
- **Pre:** P3-12 complete
- **Steps:** Open Wagers tab → Settled
- **Expected:** Wager shown with win (green) or loss (red) indicator, P&L amount, settlement date

### P3-15: Tap wager card → opens chat
- **Pre:** Any wager card in any tab
- **Steps:** Tap the card
- **Expected:** Navigates to Chat detail view for that wager

---

## Phase 4 — Social Feed + New Post

### P4-1: Feed loads from Firestore
- **Pre:** At least 2 posts in `/posts` collection
- **Steps:** Open Home tab
- **Expected:** Posts render in reverse-chronological order; no loading error

### P4-2: Photo post renders correctly
- **Pre:** Photo post exists in feed
- **Steps:** Scroll to photo post
- **Expected:** Image displayed, caption shown, poster avatar + name, like/comment counts

### P4-3: Meme post renders with Impact text overlay
- **Pre:** Meme post exists in feed with `topText` and `botText`
- **Steps:** Scroll to meme post
- **Expected:** Template image shown with white/black-stroke Impact font text at top and bottom

### P4-4: Wager-challenge post renders with Accept CTA
- **Pre:** Wager-challenge post exists in feed
- **Steps:** Scroll to wager-challenge post
- **Expected:** No image; challenger name, description, amount, "Accept" button visible

### P4-5: Wager-result post renders
- **Pre:** Wager settled (auto-posts result)
- **Steps:** Scroll to wager-result post
- **Expected:** Winner name, amount, wager description shown; no image

### P4-6: Photo picker opens
- **Pre:** On New Post compose view
- **Steps:** Tap Photo button
- **Expected:** Device photo picker opens; selected photo previews inline before posting

### P4-7: Photo post submits to Firestore
- **Pre:** Photo selected and previewed
- **Steps:** Enter caption, tap Post
- **Expected:** `/posts/{id}` created with `type: "photo"`, `imageUrl`, `caption`, `userId`, `createdAt`; post appears in feed

### P4-8: Meme picker grid shows all templates
- **Pre:** On New Post screen
- **Steps:** Tap Meme$ button
- **Expected:** 2-column grid with all 38 meme templates visible; scrollable

### P4-9: Meme editor — text overlay
- **Pre:** Meme template selected from picker
- **Steps:** Enter top text + bottom text
- **Expected:** Live preview shows Impact font text (white, black stroke) on top and bottom of template image

### P4-10: Meme post — "Use This" returns to compose
- **Pre:** Meme editor open with text entered
- **Steps:** Tap "Use This"
- **Expected:** Returns to compose view with meme shown as inline preview; top/bottom text stored

### P4-11: Meme post submits to Firestore
- **Pre:** Meme previewed in compose
- **Steps:** Tap Post
- **Expected:** `/posts/{id}` created with `type: "meme"`, `topText`, `botText`, `imageUrl`; post appears in feed

### P4-12: Wager shortcut from New Post → New Wager screen
- **Pre:** On New Post compose view
- **Steps:** Tap Wager shortcut
- **Expected:** Navigates to New Wager screen

---

## Phase 5 — Chat Integration

### P5-1: Chat list shows all wager conversations
- **Pre:** User A has 3 wagers (pending + active + settled)
- **Steps:** Open Chat tab
- **Expected:** 3 conversation rows shown; each displays opponent name, truncated wager description, last message preview, timestamp

### P5-2: Chat list ordered by last message time
- **Pre:** Multiple chats, messages sent at different times
- **Steps:** Send a message in an older chat
- **Expected:** That chat moves to top of list

### P5-3: Chat detail — pinned wager card always visible
- **Pre:** In a chat with an active wager
- **Steps:** Scroll through messages to the bottom
- **Expected:** Pinned card stays at top (does not scroll away); shows status badge, both avatars, description, amount, settle-by

### P5-4: Pinned card reflects live wager state
- **Pre:** Wager status: "pending"
- **Steps:** Opponent accepts wager
- **Expected:** Pinned card status badge updates to "Active" without requiring navigation away and back

### P5-5: H2H banner shows correct record
- **Pre:** User A has 3 wins, 1 loss vs User B (`/h2h/` doc exists)
- **Steps:** Open chat between User A and User B
- **Expected:** Banner shows "You 3 – 1 [User B name]"

### P5-6: Sending a message
- **Pre:** Chat detail open
- **Steps:** Type "you're going down" in input, tap Send
- **Expected:** Message appears in thread right-aligned with team theme color; opponent receives it via CometChat

### P5-7: Message receipt and rendering
- **Pre:** User B sends a message
- **Steps:** User A's chat updates
- **Expected:** Message appears left-aligned in neomorphic raised bubble; sender avatar + name shown; streak badge visible

### P5-8: System messages centered
- **Pre:** Wager settled
- **Steps:** Open chat for settled wager
- **Expected:** System message "🏆 [Winner] wins $X from [Loser]!" displayed centered in thread

### P5-9: Wager card custom message — on creation
- **Pre:** New wager created
- **Steps:** Open the wager's chat
- **Expected:** Wager card message appears inline in thread with left accent border showing wager details

### P5-10: Wager card custom message — on acceptance
- **Pre:** Opponent accepts wager
- **Steps:** Open wager chat
- **Expected:** New wager card message posted showing updated "Active" status

### P5-11: CometChat group created with wagerId
- **Pre:** New wager submitted
- **Steps:** Check CometChat dashboard → Groups
- **Expected:** Group exists with GUID matching the Firestore `wagerId`

### P5-12: Settle bottom sheet — triggers from chat
- **Pre:** Active wager chat open
- **Steps:** Long-press pinned card (or tap settle button)
- **Expected:** Bottom sheet opens with "Select Winner" — both user names/avatars as options

### P5-13: Settle via chat bottom sheet — end-to-end
- **Pre:** Active wager, `$25` each side
- **Steps:** Select User A as winner in bottom sheet, confirm
- **Expected:** All Phase 3 settlement checks pass (P3-12, P3-13); system message posted in chat

---

## Phase 6 — Profile, Polish & Push

### P6-1: Profile stats are accurate
- **Pre:** User A has: balance `$75`, 4W-2L, current streak 2W
- **Steps:** Open Profile tab
- **Expected:** Balance `$75`, Wins `4`, Losses `2`, Win Rate `67%`, Streak `🔥 2W`, correct Best Streak value

### P6-2: H2H tab — one card per opponent
- **Pre:** User A has wagers vs User B and User C
- **Steps:** Open Profile → H2H tab
- **Expected:** Two H2H cards in horizontal scroll; each shows "You X – Y [Name]" + total wager count

### P6-3: H2H cards read from `/h2h/` collection
- **Pre:** `/h2h/{sortedPair}` doc exists
- **Steps:** Manually update `aWins` in Firestore console, pull to refresh profile
- **Expected:** H2H card reflects updated value

### P6-4: Recent Wagers tab
- **Pre:** User A has 5 settled wagers
- **Steps:** Open Profile → Recent Wagers tab
- **Expected:** Vertical list of settled wagers; wins in green, losses in red; description, amount, date shown

### P6-5: Stats Visibility — Private (default)
- **Pre:** `statsVisibility: "private"` (default)
- **Steps:** View User A's profile from User B's device
- **Expected:** Stats hidden or shown as "Private"; Share Card button not visible

### P6-6: Stats Visibility — toggle to Public
- **Pre:** On own profile, `statsVisibility: "private"`
- **Steps:** Toggle Stats Visibility switch to Public
- **Expected:**
  - Firestore `statsVisibility` updates to `"public"` immediately
  - Share Card button appears
  - Stats now visible from other users' devices

### P6-7: Share Card generates and shares
- **Pre:** `statsVisibility: "public"`, Share Card button visible
- **Steps:** Tap Share Card
- **Expected:** Stats card image generated (W/L record + streak); native share sheet opens; shareable to Messages/social

### P6-8: Team theme picker — applies across all screens
- **Pre:** Signed in, on Profile
- **Steps:** Select "Knicks" from theme picker
- **Expected:** All screens update to Knicks color palette (blue/orange accents); FAB color changes; tab active color changes

### P6-9: Team theme persists across restart
- **Pre:** "Canucks" theme selected
- **Steps:** Force-close app, reopen
- **Expected:** Canucks theme still active (loaded from Firestore `teamTheme` field)

### P6-10: All 6 team themes render without error
- **Pre:** On Profile theme picker
- **Steps:** Cycle through Knicks → Canucks → Flames → Raiders → Eagles → 49ers
- **Expected:** Each theme applies distinct color set; no crashes; no missing colors

### P6-11: FCM — new challenge notification
- **Pre:** App backgrounded on User B's device
- **Steps:** User A creates a `$25` wager challenging User B
- **Expected:** User B receives push notification: "New challenge from [User A] — $25" within 30 seconds

### P6-12: FCM — challenge accepted notification
- **Pre:** App backgrounded on User A's device
- **Steps:** User B accepts User A's wager
- **Expected:** User A receives push notification: "[User B] accepted your $25 wager"

### P6-13: FCM — wager settled notification
- **Pre:** App backgrounded on loser's device
- **Steps:** Admin settles wager, User A wins
- **Expected:** Both users receive push notification: "[User A] wins $50 from [User B]!"

### P6-14: FCM — new chat message notification
- **Pre:** App backgrounded on User A's device
- **Steps:** User B sends a message in active wager chat
- **Expected:** User A receives push notification with sender name and message preview

### P6-15: FCM — tap notification deep-links correctly
- **Pre:** Notification received
- **Steps:** Tap the push notification
- **Expected:**
  - New challenge → opens Wagers tab → Pending
  - Chat message → opens specific chat detail
  - Settled → opens specific chat detail

---

## Component Library — `src/components/`

> These tests verify the shared component library. Run the full suite after any component is created or modified — a change in one component affects every screen that uses it.

### Tier 1 — Completed (Phases 1–2)

#### PC-1: Wordmark renders split colour `[web ok]`
- **Pre:** Any screen using `<Wordmark />`
- **Steps:** Inspect the wordmark on AuthScreen, HomeScreen, and loading splash
- **Expected:** "RUN" in `Colors.text` (#e8eaf0), "IT" in `Colors.c1` (#8b5cf6) on all three; no inconsistencies

#### PC-2: Wordmark size prop scales correctly `[web ok]`
- **Pre:** Wordmark rendered at different sizes (AuthScreen = 40, HomeScreen = 24, splash = 32)
- **Steps:** Compare all three appearances
- **Expected:** Each renders at the correct size; letterSpacing proportionally different; font family consistent

#### PC-3: Avatar colour is deterministic `[web ok]`
- **Pre:** Two users with known UIDs in Admin screen
- **Steps:** Force-close and reopen app; revisit Admin screen
- **Expected:** Each user's avatar shows the same colour as before; order does not affect colour

#### PC-4: Avatar initials extraction `[web ok]`
- **Pre:** Users with varied names in Admin screen
- **Steps:** Check avatar initials for: "Jordan King" → "JK", "Marcus" → "MA", "Sarah Chen" → "SC"
- **Expected:** All initials correct; no crash on single-word names

#### PC-5: Avatar size prop changes radius proportionally `[web ok]`
- **Pre:** Avatar rendered at size 32 (list), 44 (sheet header), 72 (profile)
- **Steps:** Visually inspect border radius at each size
- **Expected:** Radius increases with size; corners never appear circular (square-ish, not pill)

#### PC-6: NmCard visual style matches prototype `[web ok]`
- **Pre:** Admin screen loaded with users
- **Steps:** Inspect the Users and Transaction Log cards
- **Expected:** `borderRadius: 22`, `Colors.raised` background, 1px `Colors.border`, visible dark drop shadow

#### PC-7: CardDivider separates rows `[web ok]`
- **Pre:** Admin screen with 2+ users
- **Steps:** Inspect row separators
- **Expected:** 1px horizontal line in `Colors.divider` between rows; no divider after last row

#### PC-8: BottomSheet — opens and closes `[web ok]`
- **Pre:** Admin screen loaded with a user
- **Steps:** Tap Fund on a user → sheet opens; tap overlay → sheet closes; tap Fund again → tap Cancel → sheet closes
- **Expected:** Sheet slides up from bottom each time; overlay closes on tap; Cancel button closes; no ghost state

#### PC-9: BottomSheet — handle visible `[web ok]`
- **Pre:** Any bottom sheet open
- **Steps:** Inspect top of sheet
- **Expected:** 36×4px pill handle visible centred at top, `Colors.muted` colour

#### PC-10: IconButton pip visibility `[web ok]`
- **Pre:** HomeScreen loaded
- **Steps:** Inspect notification bell icon button
- **Expected:** Pill-shaped button 38×38, `borderRadius: 13`, raised shadow; `Colors.c1` pip at top-right; pip has `Colors.bg` border to separate it from the button

#### PC-11: SectionHeader — label only `[web ok]`
- **Pre:** Admin screen
- **Steps:** Inspect USERS and TRANSACTION LOG section headers
- **Expected:** Uppercase text, 10px, `Colors.muted`, `letterSpacing: 1.8`; no right-side action visible

#### PC-12: SectionHeader — with action `[web ok]`
- **Pre:** Any screen using `<SectionHeader actionLabel="See all" />`
- **Steps:** Inspect header and tap action
- **Expected:** Right-side action in `Colors.c1`; tapping fires `onAction` callback

### Tier 2 — Completed (Phase 3 prep)

All Tier 2 components are built and in `src/components/`. Run PC-13–PC-19 before starting any Phase 3 screen and include them in the regression checklist from Phase 3 onward.

#### PC-13: ScreenHeader — title centred between equal slots `[web ok]`
- **Pre:** AdminScreen loaded (uses `<ScreenHeader title="Admin" onBack={...} rightElement={<DevBadge />} />`)
- **Steps:** Inspect the top bar
- **Expected:** Back button (`‹`) left-aligned in 40×40 raised neomorphic button; "Admin" visually centred regardless of DEV ONLY badge width; DEV ONLY badge right-aligned; no overflow

#### PC-14: ScreenHeader — back button navigates `[device]`
- **Pre:** AdminScreen open (reached via triple-tap)
- **Steps:** Tap back button (`‹`)
- **Expected:** Navigates back to previous screen; no double-navigation; no crash

#### PC-15: ScreenHeader — onBack null hides back button `[web ok]`
- **Pre:** Any screen using `<ScreenHeader onBack={null} />`
- **Steps:** Inspect top bar
- **Expected:** Left slot is empty spacer (40px); title still centred; no back button rendered

#### PC-16: PrimaryButton — default state `[web ok]`
- **Pre:** Any screen with `<PrimaryButton label="Submit" onPress={fn} />`
- **Steps:** Inspect the button
- **Expected:** `Colors.c1` background, white Syne ExtraBold text, `borderRadius: 18`, visible c1 glow shadow beneath

#### PC-17: PrimaryButton — loading state `[web ok]`
- **Pre:** Any form using `<PrimaryButton loading={true} />`
- **Steps:** Trigger loading state (e.g. tap inject funds, submit form)
- **Expected:** `ActivityIndicator` replaces label text; button non-interactive; `opacity: 0.6`; no double-submit possible

#### PC-18: PrimaryButton — disabled state `[web ok]`
- **Pre:** `<PrimaryButton disabled={true} />`
- **Steps:** Inspect and attempt to tap
- **Expected:** `opacity: 0.6`; tap does not fire `onPress`; no visual press feedback

#### PC-19: StatusBadge — all statuses render `[web ok]`
- **Pre:** Render `<StatusBadge />` with each status value
- **Steps:** Inspect each: pending / active / live / win / settled / loss / declined / expired
- **Expected:**
  - `pending` → amber text + amber tint bg + amber border
  - `active` / `live` / `win` → green text + green tint bg
  - `loss` → red text + red tint bg
  - `settled` / `declined` / `expired` → muted text + muted bg
  - All: pill shape (`borderRadius: 8`), 10px text, 700 weight, 1.2 letterSpacing, uppercase label

#### PC-20: AmountPicker — inactive state `[web ok]`
- **Pre:** AmountPicker rendered (e.g. Admin fund sheet, default selection = $50)
- **Steps:** Inspect unselected buttons
- **Expected:** `Colors.raised` background, `Colors.border` border, `Colors.muted` text, visible dark drop shadow (raised)

#### PC-21: AmountPicker — active state `[web ok]`
- **Pre:** AmountPicker rendered; tap a button
- **Steps:** Tap `$100`
- **Expected:** `$100` shows `Colors.bg` background, `Colors.c1` border, `Colors.c1` text, no shadow (inset); `$50` reverts to inactive; `onSelect` called with `100`

#### PC-22: AmountPicker — custom amounts array `[web ok]`
- **Pre:** `<AmountPicker amounts={[5, 10, 25, 50, 100]} />`
- **Steps:** Inspect rendered buttons
- **Expected:** 5 buttons rendered with correct labels; equal flex widths; selection/deselection works the same

#### PC-23: EmptyState renders correctly `[web ok]`
- **Pre:** Any list screen with 0 items (e.g. Admin with no users, Wagers tab with no wagers)
- **Steps:** Navigate to empty list
- **Expected:** Icon (36px emoji) centred; title in `Colors.dim` below; subtitle in `Colors.muted` below that; vertically centred in its container; no crash on missing subtitle prop

#### PC-24: TabSelector — inactive and active tab appearance `[web ok]`
- **Pre:** WagersScreen with 3 tabs (Pending / Active / Settled)
- **Steps:** Inspect default state; tap each tab
- **Expected:** Container is raised pill (`Colors.raised`, `borderRadius: Radius.nav`); active tab shows `Colors.bg` background + `Colors.border` border (inset); active label is `Colors.c1`; inactive labels are `Colors.muted`; tabs share equal flex width

#### PC-25: TabSelector — only one tab active at a time `[web ok]`
- **Pre:** TabSelector with 3 tabs
- **Steps:** Tap Pending → Active → Settled → Pending
- **Expected:** Only the most recently tapped tab shows active state; `onSelect` fires with correct key on each tap; no two tabs active simultaneously

#### PC-26: TabSelector — scrollable mode `[web ok]`
- **Pre:** `<TabSelector scrollable={true} tabs={[...5+ tabs...]} />`
- **Steps:** Inspect and scroll
- **Expected:** Tabs scroll horizontally; no flex overflow; active/inactive styles unchanged; no horizontal scrollbar indicator visible

#### PC-27: WagerCard — compact mode layout `[web ok]`
- **Pre:** WagerCard rendered with `compact={true}` and mock `WagerCardData`
- **Steps:** Inspect the card
- **Expected:** Horizontal row: opponent avatar (36px), description (truncated to 1 line) + opponent name + expiry meta, amount right-aligned in category accent colour, `<StatusBadge />` below amount; card has `borderRadius: 22`, raised bg, left accent border in category colour

#### PC-28: WagerCard — full mode layout `[web ok]`
- **Pre:** WagerCard rendered with `compact={false}` (default)
- **Steps:** Inspect the card
- **Expected:** Category tag (uppercase, 9px, accent colour) at top; VS row with both avatars (44px) side-by-side + large amount (Syne, 26px) centred between them; full description (no truncation); `<StatusBadge />` + settle-by text in footer row

#### PC-29: WagerCard — "You vs Them" labelling based on currentUid `[web ok]`
- **Pre:** WagerCard with `currentUid === wager.creatorId`
- **Steps:** Inspect player labels in full mode
- **Expected:** Left player labelled "You" with creator's avatar colour; right player labelled with opponent's `displayName`

#### PC-30: WagerCard — category accent colour `[web ok]`
- **Pre:** Four WagerCards with each category (Sports / Awards / Politics / Custom)
- **Steps:** Inspect left border and amount text colour on each
- **Expected:** Sports=`Colors.c1` (purple), Awards=pink (`#ec4899`), Politics=amber (`#f59e0b`), Custom=`Colors.c2`; border and amount text use the same accent colour

#### PC-31: WagerCard — onPress fires and card is touchable `[web ok]`
- **Pre:** WagerCard with `onPress` callback
- **Steps:** Tap the card
- **Expected:** `onPress` fires; `activeOpacity: 0.85` gives visual feedback; no crash

#### PC-32: WagerCard — no onPress renders non-touchable `[web ok]`
- **Pre:** WagerCard with no `onPress` prop (full mode / preview)
- **Steps:** Inspect and tap
- **Expected:** Renders as plain `View`, not `TouchableOpacity`; no tap response; no ripple

---

## Regression Checklist (run after each phase)

Run these after completing each phase to catch regressions:

| Check | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|-------|---------|---------|---------|---------|---------|---------|
| App boots without crash | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Auth screen → sign in works | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bottom nav navigates correctly | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No TypeScript errors (`tsc --noEmit`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| No Firebase permission errors in console | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tier 1 component tests PC-1–PC-12 pass | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tier 2 component tests PC-13–PC-32 pass | — | — | ✓ | ✓ | ✓ | ✓ |
| New components tested before screen use | — | — | ✓ | ✓ | ✓ | ✓ |
| Wager balance never goes negative | — | — | ✓ | ✓ | ✓ | ✓ |
| CometChat messages send/receive | — | — | — | — | ✓ | ✓ |

---

## Notes

- **Atomicity:** Any test touching balance (P2-4, P3-5, P3-8, P3-10, P3-12) must be verified via Firestore console to confirm a single transaction write, not two sequential writes.
- **Two-device tests:** P3-8, P3-10, P5-6, P5-7, P6-11–P6-15 require two physical devices or simulator + device.
- **CometChat tests** (P5-x) require a development build — not runnable in Expo Go.
- **FCM tests** (P6-11–P6-15) require a development build with APNs/FCM configured and app in background/killed state.
- **Firestore rules** expire **2026-04-17** — write production rules before that date (before Phase 3 goes live).
- **Component tests:** PC-1–PC-12 are the Tier 1 baseline — run at the start of every phase. PC-13–PC-32 are the Tier 2 suite — run from Phase 3 onward. PC-33+ will be added when Tier 3 components (StatPill, PostCard, ChatBubble, H2HBanner) are created before Phase 4/5. Always test a component in isolation before integrating it into a screen.
- **Tier 2 components built:** All 7 Tier 2 components are complete and in `src/components/`. AdminScreen was refactored to use ScreenHeader, AmountPicker, PrimaryButton, and EmptyState. PC-13–PC-32 are ready to run now.
