# GoodGame — Build Plan v2
> Updated to reflect the current prototype (`runit_prototype.html`, reviewed live at GitHub Pages).
> Previous version predated the prototype. This version uses the prototype as the canonical spec.

---

## What Changed From v1
- **Home screen repositioned** — it's a social newsfeed (photo + meme + wager-activity posts), not a personal wager dashboard. The personal dashboard is the Wagers tab.
- **New Post screen added** — photo composer, meme editor (38 templates, Impact font), wager shortcut. Not in v1 at all.
- **Auth screen added** — phone number + 4-digit OTP flow. Skippable in prototype.
- **Wager model updated** — `expiresAt` is now user-set ("Settle by" field on the create form), not system-generated. `opp` replaces `challengedId`. Firestore fields aligned to prototype's `MOCK.wagers` shape.
- **Chat expanded** — two sub-views (list + detail), pinned wager card with live fields, H2H banner, streak badges on each message, bottom sheet settle flow.
- **Profile expanded** — 7 stat fields, H2H cards tab, Recent Wagers tab, Stats Visibility toggle, Share Card.
- **Wager list is its own tab** — Pending / Active / Settled tabs. Was missing from v1.
- **Admin screen unchanged** — Users list + Transaction Log + fund bottom sheet. v1 was accurate.
- **Team themes added** — 6 teams in the picker. Relevant to Phase 6 polish.
- **Component library added** — `src/components/` with 14 shared components across two tiers. Tier 1 (7 components) completed after Phase 2. Tier 2 (7 components) completed before Phase 3 screens. All screens import from this library — never inline design. AdminScreen was refactored to use Tier 2 components as part of this work.

---

## Prototype Reference
- **File:** `runit_prototype.html` (single-file, no build step)
- **Live:** https://worldxours.github.io/runit-prototype/runit_prototype.html
- **GitHub:** https://github.com/worldxours/runit-prototype
- **Images:** `images/` (4 feed photos + 38 meme templates in `images/memes/`)

Use the prototype as the living spec during every build phase. Open it alongside your code — it answers layout, component hierarchy, interaction patterns, and copy.

---

## Project Management
**GitHub + Issues + Milestones** (unchanged from v1 — still the right call for a solo build).

### Milestones (updated — 7 phases)
- `Phase 0 — Project Setup`
- `Phase 1 — Auth & User Model`
- `Phase 2 — Admin Interface`
- `Phase 3 — Core Wager Engine + Wager Screens`
- `Phase 4 — Social Feed + New Post`
- `Phase 5 — Chat Integration`
- `Phase 6 — Profile, Polish & Push`

> Phase 4 (Social Feed) is now its own phase. The feed is a primary surface, not a Phase 5 add-on.

---

## Tech Stack
| Layer | Tool |
|---|---|
| Framework | **Expo** (development builds — not Expo Go) |
| Navigation | React Navigation v6 — custom bottom tab bar, root Stack |
| Auth | Firebase Auth — **email + password** (phone/OTP moved to backlog) |
| Database | Cloud Firestore (Firebase JS SDK) |
| Chat | CometChat (free tier — 1k MAU) |
| Payments | Mock wallet (`walletBalance` in Firestore) |
| Images | `expo-image-picker` |
| Meme editor | `react-native-view-shot` + custom overlay |
| Web | Expo web (`react-native-web`) → GitHub Pages at **https://worldxours.github.io/GG/** |

> **Expo vs Expo Go:** CometChat requires custom native modules and does not run in Expo Go. Use `eas build --profile development` to generate a development build. All development and testing happens in the development build, not Expo Go. Firebase JS SDK works fine in both Expo Go and development builds — no additional native config needed for Auth + Firestore.

> **Web build:** `npm run deploy` builds the web bundle and pushes to the `gh-pages` branch. CometChat is excluded from the web bundle via Metro platform-specific files (`cometchat.native.ts` for iOS/Android, `cometchat.ts` no-op stub for web). Chat screens show a "Chat on mobile" fallback on web. GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys on push to `main` — requires `EXPO_PUBLIC_*` vars as GitHub Secrets.

---

## Component Architecture

### Principle
**Build the component first, then the screen.** Every UI pattern that appears on 2+ screens lives in `src/components/` and is imported — never inlined. This means a design change (e.g. card shadow, badge colour) is made in one place and propagates everywhere automatically.

### Component tiers

**Tier 1 — Completed (Phases 1–2)**

| Component | Props summary | Used in |
|---|---|---|
| `<Wordmark />` | `size`, `letterSpacing` | AuthScreen, HomeScreen, nav splash |
| `<Avatar />` | `uid`, `displayName`, `size` | AdminScreen → Chat, Profile, Feed |
| `<NmCard />` + `<CardDivider />` | `paddingHorizontal`, `style` | AdminScreen → all list screens |
| `<BottomSheet />` | `visible`, `onClose`, `style` | AdminScreen → settle flow, wager actions |
| `<IconButton />` | `icon`, `showPip`, `onPress`, `size` | HomeScreen → Chat, Profile headers |
| `<SectionHeader />` | `label`, `actionLabel`, `onAction` | AdminScreen → all screens |

**Tier 2 — Completed (Phase 3 prep — built before any Phase 3 screen)**

AdminScreen was refactored as part of this work to use `ScreenHeader`, `AmountPicker`, `PrimaryButton`, and `EmptyState`.

| Component | Props summary | Used in |
|---|---|---|
| `<ScreenHeader />` | `title`, `onBack`, `rightElement` | ✅ AdminScreen (refactored), NewWager, ChatDetail |
| `<PrimaryButton />` | `label`, `onPress`, `loading`, `disabled` | ✅ AdminScreen (refactored), all bottom sheets, forms |
| `<StatusBadge />` | `status` | ✅ WagerCard, Chat pinned card, Wager list rows |
| `<AmountPicker />` | `amounts`, `selected`, `onSelect` | ✅ AdminScreen (refactored), NewWager screen |
| `<EmptyState />` | `icon`, `title`, `subtitle` | ✅ AdminScreen (refactored), all list screens |
| `<TabSelector />` | `tabs`, `selected`, `onSelect`, `scrollable` | ✅ WagersScreen (Pending/Active/Settled), ProfileScreen (H2H/Recent) |
| `<WagerCard />` | `wager: WagerCardData`, `compact`, `onPress` | ✅ Most-reused component. List rows, chat pinned card, New Wager preview |

**Tier 3 — Create at Phase 4/5 start**

| Component | Props summary | Used in |
|---|---|---|
| `<StatPill />` | `label`, `value`, `accent` | WagersScreen balance card, ProfileScreen stats grid |
| `<PostCard />` | `post`, `onAction` | HomeFeed — polymorphic: photo / meme / wager-challenge / wager-result |
| `<ChatBubble />` | `message`, `isMine` | ChatDetail message list |
| `<H2HBanner />` | `record` | ChatDetail header, ProfileScreen H2H tab |

### Component creation rule
Before writing a screen in Phase N, scan the Tier 2/3 table above. Create any component that the screen needs and that doesn't exist yet. Add it to `src/components/index.ts`. Verify TypeScript compiles (`npx tsc --noEmit`) before continuing to the screen.

---

## Data Models (updated from prototype)

### `/users/{uid}`
```
displayName       string
fullName          string
walletBalance     number   (0)
lifetimeWagered   number   (0)
lifetimeWon       number   (0)
wins              number   (0)
losses            number   (0)
currentStreak     number   (0)
longestStreak     number   (0)
statsVisibility   string   ("private" | "public")
teamTheme         string   ("knicks" | "canucks" | "flames" | "raiders" | "eagles" | "49ers")
createdAt         timestamp
avatar            string   (url or null)
```

### `/users/{uid}/deposits/{depositId}`
```
amount            number
currency          string   ("CAD")
method            string   ("admin_injection")
createdAt         timestamp
status            string   ("completed" | "pending" | "failed")
addedBy           string   (admin uid)
balanceBefore     number
balanceAfter      number
notes             string   (optional)
```

### `/wagers/{wagerId}`
```
creatorId         string   (uid)
opp               string   (opponent uid — renamed from challengedId)
amount            number
desc              string   (wager description)
category          string   ("Sports" | "Awards" | "Politics" | "Custom")
status            string   ("pending" | "active" | "settled" | "declined" | "expired")
createdAt         timestamp
expiresAt         string   (user-set "Settle by" text — e.g. "End of season")
settledAt         timestamp | null
winnerId          string | null
result            string | null
```

### `/h2h/{sortedUidPair}`
Doc ID: `[uid_A, uid_B].sort().join('_')`
```
aWins             number
bWins             number
totalWagers       number
```

### `/posts/{postId}` *(new — Social Feed)*
```
type              string   ("photo" | "meme" | "wager-challenge" | "wager-result")
userId            string
imageUrl          string | null
caption           string | null
topText           string | null   (meme only)
botText           string | null   (meme only)
wagerId           string | null   (wager post types)
amount            number | null
won               boolean | null  (wager-result only)
opponentId        string | null
createdAt         timestamp
likes             number
comments          number
```

---

## Build Phases

### Phase 0 — Project Setup ✅ Complete
- [x] Create Firebase project (Firestore, Auth, FCM)
- [x] Scaffold Expo project at `/Users/Shared/RunIt/runit-app/`
- [x] Configure Firebase env vars via `.env` (EXPO_PUBLIC_* prefix)
- [x] Set up React Navigation — custom neomorphic bottom tab bar, root Stack
- [x] Apply design system: Syne + Inter fonts, Colors/Spacing/Radius/Typography tokens

**Milestone 0:** ✅ App boots, tabs navigate, design system applied

---

### Phase 1 — Auth & User Model ✅ Complete
Reference: `screen-auth` in prototype

- [x] Auth screen UI: RUNIT wordmark + tagline, email field, password field, Sign Up / Log In toggle
- [x] Sign Up: `createUserWithEmailAndPassword` — Firebase Auth
- [x] Log In: `signInWithEmailAndPassword`
- [x] On first signup: create `/users/{uid}` Firestore doc with all fields at defaults
- [x] On login: fetch user doc, hydrate AuthContext
- [x] `onAuthStateChanged` listener — persist auth state across app restarts
- [x] "Skip" link for dev mode (navigates to Home as mock user)
- [x] Basic validation + Firebase error mapping

**Components used:** `<Wordmark />`

**Milestone 1:** ✅ Users can sign up with email + password, log in, reach Home screen

#### Backlog — Phone Auth (post-MVP)
- Phone number entry + 4-digit OTP boxes
- Firebase phone auth — SMS send + verify

---

### Phase 2 — Admin Interface ✅ Complete
Reference: `screen-admin` in prototype (triple-tap RUNIT logo to access)

- [x] Admin screen gated behind triple-tap on RUNIT wordmark
- [x] Users section: list all `/users` with `displayName` + `walletBalance`
- [x] Fund injection bottom sheet — amount, Firestore transaction, deposit subcollection write
- [x] Transaction Log section — `collectionGroup(db, 'deposits')`, ordered by `createdAt` desc
- [x] Admin screen hidden from bottom nav

**Components used:** `<Avatar />`, `<NmCard />`, `<CardDivider />`, `<BottomSheet />`, `<SectionHeader />`, `<ScreenHeader />` (refactor), `<AmountPicker />` (refactor), `<PrimaryButton />` (refactor), `<EmptyState />` (refactor)

**Milestone 2:** ✅ Admin can inject mock funds; transaction log shows history

---

### Phase 3 — Core Wager Engine + Wager Screens (~5–6 days)
Reference: `screen-new-wager`, `screen-wagers`, `screen-chat` (settle flow) in prototype

> ✅ **All Tier 2 components built.** No component work required before starting Phase 3 screens — all 7 components are in `src/components/` and exported from the barrel file.

#### Components — all ready ✅
- [x] `<ScreenHeader title onBack rightElement />` — top bar with back + title + optional right slot
- [x] `<PrimaryButton label onPress loading disabled />` — purple CTA, Syne font, glow shadow
- [x] `<StatusBadge status />` — pending (amber) / active (green) / settled (muted) / live (green) / win (green) / loss (red) / declined (muted)
- [x] `<AmountPicker amounts selected onSelect />` — row of neomorphic quick-select buttons, inset on active
- [x] `<EmptyState icon title subtitle />` — centred empty state for all list screens
- [x] `<TabSelector tabs selected onSelect scrollable />` — horizontal tab switcher, inset-on-active, generic typed
- [x] `<WagerCard wager compact onPress />` — compact mode (list row) + full mode (pinned chat card / preview)

#### New Wager Screen (`screen-new-wager`)
- [ ] Opponent selector row: horizontal scroll of friend avatars — use `<Avatar />`
- [ ] Category pills: Sports / Awards / Politics / Custom — use `<TabSelector />` or similar pill group
- [ ] "What's the bet?" textarea (inset neomorphic field)
- [ ] Amount quick-select: $5 / $10 / $25 / $50 / $100 — use `<AmountPicker />`
- [ ] "Settle by" free-text field
- [ ] Live preview card at bottom — use `<WagerCard />` in preview mode
- [ ] Submit: validate balance ≥ amount, write `/wagers/{wagerId}`, deduct balance via Firestore transaction
- [ ] Navigate to chat on submit
- [ ] Screen header — use `<ScreenHeader />`
- [ ] Submit button — use `<PrimaryButton />`

#### Wager List Screen (`screen-wagers`) — Personal Dashboard
- [ ] Balance card at top: wallet balance (Syne numeral), W/L/rate stat pills, streak
- [ ] Three tabs: Pending / Active / Settled — use `<TabSelector />`
- [ ] Pending challenge card: opponent avatar, description, amount, Accept + Decline buttons
- [ ] Wager rows per tab — use `<WagerCard compact />` with `<StatusBadge />`
- [ ] Empty tab state — use `<EmptyState />`
- [ ] Tap any wager card → navigate to its chat

#### Wager Engine (Firestore + logic) — `src/lib/wagerService.ts`
- [ ] `createWager(data)` — write doc + deduct creator balance (transaction)
- [ ] `acceptWager(wagerId)` — deduct opponent balance + status → "active" (transaction)
- [ ] `declineWager(wagerId)` — return creator funds + status → "declined" (transaction)
- [ ] `settleWager(wagerId, winnerId)` — transfer pot + update wins/losses/streak + upsert H2H (transaction)
- [ ] `getUserWagers(uid)` — query wagers where creator or opponent

**Milestone 3:** Full wager loop end-to-end — create, accept/decline, settle, balance updates, W/L records

---

### Phase 4 — Social Feed + New Post (~4–5 days)
Reference: `screen-home`, `screen-new-post` in prototype

> ⚠️ **Create Tier 3 components before writing feed screens.**
> Components to create first: `StatPill`, `PostCard`

#### Components to create at Phase 4 start
- [ ] `<StatPill label value accent />` — single stat display, used 6-up on Wagers + Profile
- [ ] `<PostCard post onAction />` — polymorphic feed card: photo / meme / wager-challenge / wager-result

#### Home Feed (`screen-home`)
- [ ] Header: RUNIT wordmark (triple-tap admin) + `<IconButton icon="🔔" showPip />` + real `<Avatar />` from AuthContext
- [ ] Feed from `/posts` collection, ordered by `createdAt` desc
- [ ] All post types rendered via `<PostCard />` — photo, meme, wager-challenge, wager-result
- [ ] Like + comment count display (non-interactive for MVP)
- [ ] Wager-challenge Accept → navigates to New Wager screen pre-filled

#### New Post Screen (`screen-new-post`) — FAB "+"
Three sub-views:

**Compose view:**
- [ ] Textarea: "What's on your mind?"
- [ ] Photo button → device photo picker (`expo-image-picker`)
- [ ] Meme$ button → Meme Picker sub-view
- [ ] Wager shortcut → New Wager screen
- [ ] Post button — use `<PrimaryButton />`

**Meme Picker sub-view:**
- [ ] 2-column grid of 38 meme templates (from `images/memes/`)

**Meme Editor sub-view:**
- [ ] Template background + top/bottom Impact font text inputs
- [ ] Live preview; "Use This" returns to compose

**Milestone 4:** Users can post photos, memes with Impact text, and wager activity to the social feed

---

### Phase 5 — Chat Integration (~4–5 days)
Reference: `screen-chat` in prototype

> ⚠️ **Create Tier 3 components before writing chat screens.**
> Components to create first: `ChatBubble`, `H2HBanner`

#### Components to create at Phase 5 start
- [ ] `<ChatBubble message isMine />` — message bubble, right-aligned own (team theme colour) / left-aligned neomorphic other
- [ ] `<H2HBanner record />` — "You 3 – 1 Marcus" banner strip

#### Chat List
- [ ] Lists all user wagers (active + pending), ordered by last message time
- [ ] Each row: `<Avatar />` + wager description truncated + last message + timestamp — use `<NmCard />`
- [ ] Empty state — use `<EmptyState />`

#### Chat Detail
- [ ] **Pinned wager card** — use `<WagerCard />` full mode (non-scrolling, always at top)
- [ ] **H2H banner** — use `<H2HBanner />`
- [ ] **Messages** — use `<ChatBubble />` per message; system messages centred
- [ ] **Status badge** on pinned card — use `<StatusBadge />`
- [ ] Chat input: "Talk trash…" placeholder + send button
- [ ] CometChat group auto-created on wager creation (GUID = wagerId)
- [ ] Custom `wager_card` message type on: created / accepted / settled
- [ ] System message on settlement

#### Settle Bottom Sheet
- [ ] Triggered from chat (long-press pinned card or settle button)
- [ ] Use `<BottomSheet />` + `<PrimaryButton />`
- [ ] Winner selection → calls `settleWager()` from Phase 3

**Milestone 5:** Every wager lives in a chat — card, trash talk, H2H, settlement announcement

---

### Phase 6 — Profile, Polish & Push (~4–5 days)
Reference: `screen-profile` in prototype

#### Profile Screen
- [ ] User `<Avatar size={72} />` + display name
- [ ] 6-up stat grid — use `<StatPill />` ×6
- [ ] Two tabs — use `<TabSelector />`: Head to Head / Recent Wagers
- [ ] H2H tab: horizontal scroll of H2H cards — use `<H2HBanner />` or a dedicated card — reads `/h2h/`
- [ ] Recent Wagers tab: settled wager list — use `<WagerCard compact />` with win/loss colour
- [ ] Settings section: Theme picker, Stats Visibility toggle, Share Card button
- [ ] Theme picker saves `teamTheme` to Firestore → updates `Colors.c1` context app-wide

#### Push Notifications (FCM)
- [ ] New challenge received
- [ ] Challenge accepted
- [ ] Wager settled (with result)
- [ ] New chat message in active wager

#### Remaining Prototype Gaps (V2 — not MVP)
- [ ] Notifications screen
- [ ] User search / adding friends
- [ ] Wager acceptance from feed challenge card
- [ ] Real photo upload posting to feed
- [ ] Meme post posting to feed
- [ ] Leaderboard screen
- [ ] Like / comment interactions
- [ ] **Team theme picker during onboarding** — 6-team colour picker as step after sign-up before Home. Saves `teamTheme` to Firestore. (Profile Settings remains the persistent home.)

**Milestone 6:** Prototype-complete. All screens implemented. Real user testing ready.

---

## Firestore Backlog — DB Optimisations (post-MVP)

These are not blockers for any phase but should be addressed before scaling or public launch.

### 1. Move deposits to a top-level collection (High priority)
**Current:** `/users/{uid}/deposits/{depositId}` — subcollection per user.
**Problem:** The Admin transaction log requires a `collectionGroup` query across all users, which needs a field override index + wildcard security rule (`/{path=**}/deposits/{depositId}`). Both were added as workarounds but add unnecessary complexity.
**Fix:** Migrate to `/deposits/{depositId}` top-level collection with a `uid` field. Admin query becomes a simple `orderBy('createdAt', 'desc')`. User history becomes `where('uid', '==', uid)`. No special indexes or wildcard rules needed.
**Touches:** `adminService.ts`, `wagerService.ts` (fund injection writes), `userService.ts`, `firestore.rules`, `firestore.indexes.json`.

### 2. Add `participants` array to wager docs (Medium priority)
**Current:** `getUserWagers` fires two parallel Firestore queries (`creatorId == uid` + `opp == uid`) and merges them client-side. This doubles reads on every Wagers screen load.
**Fix:** Add `participants: [creatorId, oppId]` to the wager doc at creation time. Replace the two-query merge with a single `where('participants', 'array-contains', uid)` query. Halves read cost and simplifies `getUserWagers`.
**Touches:** `wagerService.ts` (createWager + getUserWagers), `types/index.ts` (WagerDoc).

### 3. Ledger-based balance (Low priority — scale only)
**Current:** `balance` stored directly on the user doc, mutated in every wager transaction.
**Problem:** At high concurrency, the user doc becomes a write hotspot (every accept/decline/settle touches it). Fine for friend-scale usage.
**Fix (if needed):** Append-only `/ledger/{uid}/entries/{id}` records; balance computed at read time or via a Cloud Function running total. Only relevant at significant scale.

---

## Navigation Map (from prototype)

```
Auth Screen
  └─ Skip / Verify → Home

Bottom Nav (visible on all screens except Auth, Admin, New Wager):
  ⚡ Home       → screen-home (social feed)
  📋 Wagers     → screen-wagers (personal dashboard, 3 tabs)
  [FAB +]       → screen-new-post (photo / meme / wager shortcut)
  💬 Chat       → screen-chat → chat-list-view → chat-detail-view
  👤 Profile    → screen-profile (stats, H2H tab, Recent tab, Settings)

From anywhere:
  Triple-tap RUNIT → Admin screen (hidden, no nav item)
  Tap wager card   → Chat detail for that wager
  Tap user avatar  → Profile screen
```

---

## Critical Path
Phase 3 (Wager Engine) is the critical path — Phases 5 and 6 depend on it. Phase 4 (Social Feed) can be built in parallel with Phase 5 since it has no dependencies on CometChat.

Suggested parallel track for two-phase sprints:
- **Sprint A:** Phase 0 + 1 + 2 (setup, auth, admin) ✅
- **Sprint B:** Phase 3 (wager engine — critical path, do first)
- **Sprint C:** Phase 4 + Phase 5 in parallel (feed + chat)
- **Sprint D:** Phase 6 (profile, theme, push, polish)
