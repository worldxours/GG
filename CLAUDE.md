# RunIt — Claude Session Context

## Key Documents

| Document | Path | Purpose |
|---|---|---|
| **Build Plan** | `BUILD_PLAN.md` | Phase-by-phase feature spec, data models, milestones, tech stack, component guidance per phase |
| **Test Plan** | `TEST_PLAN.md` | Per-phase test cases with preconditions, steps, and expected results. Run before marking any phase complete. |
| **Design Reference** | `DESIGN.md` | RN translation of the neomorphic design system — shadows, radii, typography, component patterns |

---

## What This Project Is
RunIt is a social sports wagering app. Friends place bets against each other (not a sportsbook), share sports content, and talk trash. Think a mashup of Venmo + Instagram + iMessage, sports-flavoured.

The prototype (UI-only, single HTML file with mock data) lives at `/Users/Shared/RunIt/runit_prototype.html`. This repo (`runit-app/`) is the real build (Firebase/Firestore backend).

---

## React Native App — Architecture

### Source layout
```
src/
  components/       ← Shared UI components (see below — use before building screens)
  context/          ← React context providers (AuthContext)
  lib/              ← Firebase/Firestore service functions (no UI)
  navigation/       ← Root navigator, tab bar, screen registration
  screens/          ← One file per screen — import components, do not inline design
  theme/            ← Colors, Spacing, Radius, Typography tokens
  types/            ← Shared TypeScript interfaces (UserDoc, WagerDoc, etc.)
```

### Architectural principles
1. **Build the component first, then the screen.** Before writing a screen, check `src/components/` — if the UI element exists, import it. If it doesn't exist yet but will be used on 2+ screens, create it first.
2. **Screens are thin.** Screens import components and wire up data. Layout and style logic lives in the component.
3. **Theme tokens only — no raw hex values.** All colors → `Colors.*`, all spacing → `Spacing.*`, all radii → `Radius.*`. Exceptions: one-off opacity tints (e.g. `rgba(Colors.c1, 0.15)`) are acceptable inline.
4. **One style object per file.** `StyleSheet.create({})` at the bottom of each file. No inline `style={{ }}` except for dynamic values (e.g. `{ width: size }`).
5. **Services are pure functions.** `src/lib/` files contain only Firestore/Firebase calls — no `useState`, no navigation. Screens call service functions.
6. **TypeScript strict — 0 errors before any commit.** Run `npx tsc --noEmit` before marking a phase complete.

---

## Component Library — `src/components/`

All components are exported from the barrel file: `import { Wordmark, Avatar, NmCard } from '../components'`

> **Architectural rule:** Build the component before the screen. If a UI pattern appears on 2+ screens, it lives in `src/components/` — never inlined. A design change made in one component propagates to every screen that uses it automatically.

### Tier 1 — Completed (Phases 1–2)

| Component | Props | Purpose |
|---|---|---|
| `<Wordmark size letterSpacing />` | `size?: number` `letterSpacing?: number` | RUNIT split-colour wordmark. "RUN" in `Colors.text`, "IT" in `Colors.c1`. |
| `<Avatar uid displayName size />` | `uid: string` `displayName: string` `size?: number` | Square avatar with colour-coded initials. Colour is deterministic from uid — consistent everywhere. |
| `<NmCard paddingHorizontal style>` | `paddingHorizontal?: number` `style?: ViewStyle` | Raised neomorphic card. `borderRadius: Radius.card (22)`, `Colors.raised` bg, 6×6 shadow. |
| `<CardDivider />` | — | 1px `Colors.divider` horizontal rule between card rows. |
| `<BottomSheet visible onClose style>` | `visible: boolean` `onClose: () => void` `style?: ViewStyle` | Slide-up modal with dark overlay, drag handle, `borderTopRadius: Radius.sheet (28)`. Tap overlay to dismiss. |
| `<IconButton icon showPip onPress size />` | `icon: string` `showPip?: boolean` `onPress?: fn` `size?: number` | 38×38 raised neomorphic button. Optional `Colors.c1` notification pip. |
| `<SectionHeader label actionLabel onAction />` | `label: string` `actionLabel?: string` `onAction?: fn` | 10px uppercase muted label + optional right-side tappable action. |

### Tier 2 — Completed (Phase 3 prep)

These were built before Phase 3 screens. AdminScreen was refactored to use `ScreenHeader`, `AmountPicker`, `PrimaryButton`, and `EmptyState` as part of this work.

| Component | Props | Purpose |
|---|---|---|
| `<ScreenHeader title onBack rightElement />` | `title: string` `onBack?: fn \| null` `rightElement?: ReactNode` | Top bar for every push screen. Back button left, title centred, optional right slot (e.g. DEV badge). |
| `<PrimaryButton label onPress loading disabled />` | `label: string` `onPress: fn` `loading?: bool` `disabled?: bool` | Purple CTA button. Syne ExtraBold, `borderRadius: 18`, c1 glow shadow. Loading → spinner, disabled → opacity 0.6. |
| `<StatusBadge status />` | `status: WagerStatus \| 'live' \| 'win' \| 'loss'` | Coloured pill with semi-transparent tint bg. pending=amber, active/live/win=green, loss=red, settled/declined=muted. |
| `<AmountPicker amounts selected onSelect />` | `amounts?: number[]` `selected: number` `onSelect: fn` | Row of neomorphic quick-select amount buttons. Inset (bg + c1 border) on active. Custom amounts array optional. |
| `<EmptyState icon title subtitle />` | `icon: string` `title: string` `subtitle?: string` | Centred empty-list state. `flex: 1` — fills its container. Used on every list screen. |
| `<TabSelector tabs selected onSelect scrollable />` | `tabs: {key,label}[]` `selected: T` `onSelect: fn` `scrollable?: bool` | Horizontal tab switcher. Container = raised pill. Active = inset (bg + border). Generic over T — TypeScript infers tab union type. |
| `<WagerCard wager compact onPress />` | `wager: WagerCardData` `compact?: bool` `onPress?: fn` | **Most-reused component.** Compact mode: list rows. Full mode: pinned chat card / New Wager preview. Left accent border = category colour. |

### Tier 3 — Phase 4 complete, Phase 5 pending

> **Rule:** Create the component in `src/components/` before writing the screen that uses it. Do not inline it.

| Component | Status | Purpose |
|---|---|---|
| `<StatPill label value accent />` | ✅ Done | Single stat display (label + value). Used 6-up on Wagers + Profile screens. |
| `<PostCard post authorName opponentName />` | ✅ Done | Polymorphic feed card — photo / meme / wager-challenge / wager-result. `PostWithId` type defined in `postService.ts`, re-exported from PostCard. |
| `<ChatBubble message isMine />` | 🔲 Phase 5 | Message bubble. Own: right-aligned, `Colors.c1` bg. Other: left-aligned, raised neomorphic. System messages: centred muted italic. |
| `<H2HBanner record />` | 🔲 Phase 5 | "You 3 – 1 Marcus" banner strip in chat detail. Props: `myWins`, `theirWins`, `theirName`. |

---

## Prototype File
- **Main file:** `/Users/Shared/RunIt/runit_prototype.html`
- **Images:** `/Users/Shared/RunIt/images/` (4 feed photos + 38 meme templates in `images/memes/`)
- **Live URL:** https://worldxours.github.io/runit-prototype/runit_prototype.html
- **GitHub repo (prototype):** https://github.com/worldxours/runit-prototype
- **GitHub repo (RN app):** https://github.com/worldxours/GG

### Running locally (via preview server)
A `.claude/launch.json` is configured. Use `preview_start "RunIt Prototype"` or:
```bash
python3 -m http.server 3456 --directory /Users/Shared/RunIt
# → http://localhost:3456/runit_prototype.html
```

---

## Prototype Architecture

### Single HTML file — all CSS + JS + HTML in one file
- No build step, no npm, no frameworks
- Screens toggled with `display:none/flex` — only one `.screen.active` at a time
- Routing: `navTo(id)` — central function, manages screen visibility + nav state + history stack
- Back navigation: `goBack()` pops `screenHistory` stack

### Screen IDs
| ID | Tab/Nav |
|----|---------|
| `auth` | Login (initial) |
| `home` | ⚡ Home — social newsfeed |
| `wagers` | 📋 Wagers — personal dashboard |
| `new-post` | FAB "+" — post composer |
| `new-wager` | New wager form |
| `chat` | 💬 Chat — conversation list + detail sub-views |
| `profile` | 👤 Profile |
| `admin` | Triple-tap RUNIT logo |

### Chat screen has two sub-views (not separate screens)
- `#chat-list-view` — conversation list (shown when Chat nav tapped)
- `#chat-detail-view` — individual conversation
- `showChatList()` / `openChatConversation(wagerId)` toggle between them

### New Post screen has three sub-views
- `#np-compose` — main composer (textarea + photo/wager/meme buttons)
- `#np-meme-picker` — 2-col grid of meme templates (rendered dynamically from `MEME_TEMPLATES` array)
- `#np-meme-editor` — meme canvas with Impact font text overlay

### Design System — Neomorphic
CSS variables: `--bg`, `--raised`, `--border`, `--sd`, `--sl`, `--c1`, `--c2`, `--glow-soft`, `--glow-mid`, `--text`, `--dim`, `--muted`, `--divider`, `--vs`, `--btn`, `--btnsh`, `--btnc`, `--youGrad`

Fonts: **Syne** (800/700 — headings, numbers) + **Inter** (500/600 — body)

Phone shell: `375px` wide, `700px` tall (fixed height with `overflow:hidden` — critical for consistent screen heights)

> ⚠️ **React Native build design reference:** `DESIGN.md`
> This file is the authoritative translation of the prototype's design system into React Native patterns — shadow strategies, exact border radii, typography scale, component patterns, and a "do not do" list. Every screen must be checked against it before the phase is marked complete.

### Team Themes (theme picker = `<select>` dropdown)
Knicks, Canucks, Flames, Raiders, Philadelphia Eagles, San Francisco 49ers

### Key JS patterns
- `navTo(id)` — route to a screen
- `renderFeed()` — populates `#home-feed` from `MOCK.feed`
- `renderChatList()` — populates `#chat-convo-list` from `MOCK.wagers`
- `renderChat(wagerId)` — populates chat detail view
- `MEME_TEMPLATES` — array of filenames from `images/memes/`, used by `renderMemePickerGrid()`
- `selectMemeByIndex(i)` — opens meme editor for template at index i
- `IMG_DATA` does NOT exist yet — images are referenced as relative paths (requires the `images/` folder or GitHub Pages)

### Mock Data (all in `MOCK` object)
- `MOCK.feed` — 7 posts (meme, photo×3, wager-challenge, wager-result×2)
- `MOCK.wagers` — 7 wagers (w1–w7) across 4 opponents
- `MOCK.users` — 5 users (marcus, danny, sarah, tyler, alex)
- `MOCK.messages` — chat messages keyed by wager ID
- `MOCK.h2h` — head-to-head records per opponent
- `MOCK.currentUser` — JK (Jordan K.), the logged-in user

---

## What's Implemented (RN app)
- [x] Phase 0 — project scaffold, Firebase config, navigation shell, fonts, design system
- [x] Phase 1 — Auth (email/password), Firestore user doc, AuthContext, AuthScreen UI
- [x] Phase 2 — Admin screen (triple-tap), users list, fund injection, transaction log
- [x] Component library Tier 1 — 7 shared components (Wordmark, Avatar, NmCard, CardDivider, BottomSheet, IconButton, SectionHeader)
- [x] Component library Tier 2 — 7 Phase 3 prep components (ScreenHeader, PrimaryButton, StatusBadge, AmountPicker, EmptyState, TabSelector, WagerCard)
- [x] AdminScreen refactored — uses ScreenHeader, AmountPicker, PrimaryButton, EmptyState
- [x] Phase 3 — wagerService (createWager, acceptWager, declineWager, settleWager, getUserWagers), NewWagerScreen, WagersScreen (balance card, 3 tabs, accept/decline flows)
- [x] Phase 4 — postService (createPost, getFeedPosts), HomeScreen (social feed, pull-to-refresh), NewPostScreen (compose / meme-picker / meme-editor sub-views, expo-image-picker)
- [x] Component library Tier 3 partial — StatPill, PostCard (photo/meme/wager-challenge/wager-result)
- [x] Wager-challenge auto-post — written atomically inside createWager transaction; appears in feed immediately after wager creation

## What's Next
- [ ] Phase 5 — Chat Integration ← **start here** (build ChatBubble + H2HBanner first)
- [ ] Phase 6 — Profile, Polish & Push Notifications

## Phase 5 — Architecture Notes (read before starting)

### Chat messaging backend — use Firestore, not CometChat SDK directly
CometChat requires a native development build (not Expo Go). The SDK is currently stubbed in `src/lib/cometchat.ts`. **For Phase 5, implement real-time messaging using a Firestore subcollection:**

```
/wagers/{wagerId}/messages/{msgId}
  text        string
  userId      string
  type        string   ("text" | "system" | "wager_card")
  createdAt   timestamp
```

Use `onSnapshot` for real-time updates. This works in Expo Go + web preview and is a perfectly valid permanent solution for friend-scale usage. CometChat can layer on top later if push notifications from chat are needed.

### Navigation — ChatDetail is a push screen in the root Stack
Do NOT implement chat as sub-views inside `ChatScreen`. Instead:
- `ChatScreen` (the tab) = Chat List only
- `ChatDetailScreen` = new push screen registered in `src/navigation/index.tsx` as `ChatDetail`
- Route param: `{ wagerId: string }`
- `WagersScreen.tsx` line ~286 has a `console.log('[Phase 5] navigate to chat:', w.id)` placeholder — wire it to `(navigation as any).navigate('ChatDetail', { wagerId: w.id })`

### Settle flow — who can call settleWager?
`settleWager(wagerId, winnerId)` is already implemented in `wagerService.ts`. Both participants can call it (no ownership check). The settle bottom sheet in ChatDetail should show both players as selectable winner options.

---

## Prototype — What's NOT Yet in RN (future phases)
- [ ] Notifications screen
- [ ] User search / adding friends
- [ ] Wager acceptance flow (from the feed challenge card)
- [ ] Real photo upload posting to feed
- [ ] Meme post posting to feed
- [ ] Leaderboard screen
- [ ] Settings / account screen

## Marketing / Web Backlog
- [ ] **Landing page** — sports objects parallax hero, inspired by about.kick.com. Floating 3D sports props (ball, jersey, trophy, etc.) on layered depth planes that shift on scroll/mouse-move. Neomorphic dark palette matching the app. Separate from the RN app — standalone HTML/web project.
