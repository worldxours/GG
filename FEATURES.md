# GoodGame — Feature Backlog

Prioritised list of missing or incomplete features. Each item includes a brief description, the user value it delivers, and rough implementation notes.

---

## 🔴 High Priority — Core Loop Gaps

These features are missing from a fully playable version of the app. Without them, the core wager-and-compete loop is broken or feels unfinished.

---

### 1. Push Notifications
**Why:** The entire real-time social layer depends on this. Users won't come back if they don't know when a wager was accepted, a message arrived, or they were called out.

**Triggers needed:**
- Wager received (someone challenged you)
- Wager accepted / declined
- Wager settled
- New DM message
- Contact added you

**Implementation notes:**
- Expo Push Notifications (`expo-notifications`) for the device token
- Firebase Cloud Functions to trigger server-side pushes on Firestore writes
- Store `expoPushToken` on `UserDoc` on first app launch
- Cloud Function: `onWrite` to `/wagers/{id}` and `/users/{uid}/contacts/{id}` → send push to affected user

---

### 2. Wager Acceptance from the Feed
**Why:** The viral growth loop — someone posts a wager challenge to the Home feed and their friends accept directly from the post. Without this, the feed is read-only and wager-challenge posts are dead ends.

**Current state:** `PostCard` renders wager-challenge cards but the "Accept" button is a stub (`console.log`).

**Implementation notes:**
- `PostCard` receives an `onAccept` callback for `wager-challenge` type posts
- `HomeScreen` wires `onAccept` → `acceptWager(wagerId)` from `wagerService`
- On success: optimistic UI update (card flips to `wager-result` style or shows "Accepted" state)
- Guard: don't show Accept button if the viewer is the creator, or wager is already active/settled

---

### 3. Other-User Profile View
**Why:** Social apps live and die on profile views. Tapping a name anywhere in the app should open that person's profile — their stats, your H2H record, and recent wagers together.

**Current state:** No `UserProfileScreen` exists. Names are text-only everywhere.

**Implementation notes:**
- New push screen `UserProfileScreen` with route param `{ uid: string }`
- Shows: avatar, username, full name, stats (if `statsVisibility === 'public'`), H2H banner (your record vs. them), and their recent settled wagers
- Register in `navigation/index.tsx` as `UserProfile`
- Wire up from: `WagerCard` opponent name, `H2HRow` in ProfileScreen, `ChatBubble` sender name (tap → profile)

---

### 4. Notifications Screen
**Why:** Users need a centralised inbox for all system events — not just push alerts, but a persistent history of activity they can scroll through.

**Events to surface:**
- New wager received
- Wager accepted / declined / settled
- Someone added you as a contact
- A wager you're watching expires soon

**Implementation notes:**
- New tab or modal screen `NotificationsScreen`
- Backed by Firestore subcollection `/users/{uid}/notifications/{id}` — Cloud Functions write to it on relevant events
- Mark-as-read on open (`read: boolean` field)
- `IconButton` pip on Chat or a new Bell tab shows unread count
- Tab bar pip on the Chat icon already supports `showPip` — reuse for unread notifications count

---

## 🟡 Medium Priority — Engagement & Retention

These features significantly improve stickiness and repeat usage but don't block the core loop.

---

### 5. Home Feed Tabs (All / Contacts Only)
**Why:** As the friend graph grows, the feed fills with content from people the user barely knows. A Contacts-only tab lets users focus on people they actually care about, improving signal-to-noise ratio.

**Implementation notes:**
- `TabSelector` at top of HomeScreen: "ALL" | "CONTACTS"
- "ALL" tab = current behaviour (`getFeedPosts` — all posts, newest first)
- "CONTACTS" tab = fetch current user's contact UIDs from Firestore, then either:
  - Client-side filter: filter `getFeedPosts` results where `post.data.userId` is in contactUids (simple, works at small scale)
  - Firestore query: `where('userId', 'in', contactUids)` — efficient but limited to 30 UIDs per query (use `in` batching for larger contact lists)
- Persist selected tab to `AsyncStorage` so the preference survives app restarts

---

### 6. Rematch Button
**Why:** The easiest way to create another wager is to replicate the last one. One tap from a settled wager should pre-fill NewWagerScreen with the same opponent, amount, and description.

**Implementation notes:**
- Add "Rematch" `TouchableOpacity` to settled `WagerCard` (full mode only)
- Navigate to `NewWager` with pre-filled params: `{ oppUid, amount, desc, category }`
- `NewWagerScreen` reads optional route params and pre-fills form fields

---

### 7. Leaderboard
**Why:** Ranked competition among friends is a core GoodGame hook — "who's up, who's down." This drives daily check-ins.

**Views:**
- Win rate rank
- Net profit/loss rank
- Current win streak rank

**Implementation notes:**
- Query `/users` collection ordered by `wins`, `lifetimeWon - lifetimeWagered`, `currentStreak`
- Scoped to contacts only (leaderboard among people you know)
- New tab screen `LeaderboardScreen` or a section on `HomeScreen`
- Refresh on pull-to-refresh

---

### 8. Post Interactions (Likes + Comments)
**Why:** The Home feed needs social engagement signals — likes give passive feedback, comments let friends talk trash on a specific post.

**Current state:** `PostDoc` has `likes: number` and `comments: number` fields but neither is wired up.

**Implementation notes:**
- **Likes:** `likePost(postId, uid)` writes to `/posts/{id}/likes/{uid}` subcollection; transaction increments `likes` counter; button shows filled/outline state
- **Comments:** `/posts/{id}/comments/{id}` subcollection with `text`, `userId`, `createdAt`; tap comment count → `PostCommentsScreen`
- `PostCard` already has placeholder like/comment UI in the prototype — wire up

---

### 9. Dispute / Contest Flow
**Why:** What happens when both players disagree on who won? Currently either party can call `settleWager(wagerId, anyWinnerId)` with no verification. This is a trust issue at scale.

**Options (pick one):**
- **Mutual confirmation:** both users must independently confirm the same winner before `settleWager` writes; show a "Pending confirmation" state
- **Evidence upload:** allow attaching a screenshot/photo as proof when settling
- **Admin escalation:** disputed wagers get flagged → Admin screen shows a dispute queue

**Implementation notes:**
- Add `pendingWinnerId` and `settledByUid` fields to `WagerDoc`
- First settle call sets `pendingWinnerId`; second user confirming the same winner finalises; confirming a different winner sets a `disputed: true` flag
- Admin screen dispute queue: filter `getUserWagers` where `disputed === true`

---

### 10. Wager Expiry Handling
**Why:** Expired wagers (`status: 'expired'`) currently just sit in the Wagers tab with no resolution. Both users should be notified and the wager should be visually clearly dead.

**Implementation notes:**
- Cloud Function `onSchedule` (daily cron) queries wagers where `expiresAt < now && status === 'pending'` → batch-update to `status: 'expired'`
- Or: client-side — on `WagersScreen` load, detect locally expired pending wagers and call an `expireWager(id)` service function
- Send push notification to both parties: "Your wager vs. [opponent] expired without being accepted"

---

## 🟢 Lower Priority — Polish & Growth

Nice-to-have features that improve the product but can wait until the core loop is solid.

---

### 11. Settings Screen
**Why:** Users need a dedicated screen for account management beyond the profile settings sheet.

**Settings to include:**
- Change password (Firebase `updatePassword`)
- Notification preferences (per-event toggles stored on `UserDoc`)
- Delete account (Firebase `deleteUser` + Firestore cleanup)
- Privacy: block a user

---

### 12. Share / Deep Link (Invite Flow)
**Why:** Growth. A user should be able to send a wager challenge link to someone not yet in the app — link opens to sign-up + pre-filled wager context.

**Implementation notes:**
- Expo `expo-linking` + Firebase Dynamic Links (or Branch.io)
- Deep link schema: `goodgame://wager/{wagerId}` or `goodgame://challenge/{uid}`
- On cold-start with a deep link: after auth, navigate to the relevant screen

---

### 13. Rich Media in Chat
**Why:** Send a wager card directly in a DM ("Rematch?"), share a screenshot, or celebrate a win with a meme in chat. Makes DMs much more fun than plain text.

**Implementation notes:**
- CometChat supports custom message types — use `CustomMessage` with `type: 'wager_card'` and the wager data in the metadata object
- `ChatBubble` already has `type: 'wager_card'` in its `NormalizedMessage` interface — render a compact `WagerCard` when this type is received
- Photo messages: CometChat `MediaMessage` type with image

---

### 14. Wallet Funding
**Why:** The `walletBalance` field exists but there's no way to put real money in. For real-money wagering, a payment layer is required.

**Options:**
- **Virtual credits only:** fund via Admin injection (current); fine for friends who trust each other with Venmo/cash settlement outside the app
- **Stripe:** `StripeProvider` in the app; payment intent on the backend; credits deposited on success
- **Apple/Google Pay:** Expo `expo-in-app-purchases` or Stripe's native sheet

**Note:** Real-money gambling regulation varies significantly by jurisdiction. Consult a lawyer before enabling real-money transfers.

---

### 15. Group Wagers
**Why:** Let three or more friends bet on the same outcome — e.g., "Who calls the Super Bowl winner correctly?" The winner-takes-all pot is more exciting than 1:1.

**Implementation notes:**
- New `type: 'group'` on `WagerDoc`
- `participants: string[]` array of UIDs
- `contributions: Record<uid, number>` for variable stakes
- Pool settles when all participants confirm the winner (majority or admin-designated)

---

### 16. Stories / Moments
**Why:** Ephemeral content (24-hour posts) tied to big wins, trash talk, or highlight reels. Drives daily opening habits.

**Implementation notes:**
- `/stories/{uid}/items/{id}` with TTL handled by a scheduled Cloud Function (or `expiresAt` field client-filtered)
- Shown as avatar rings at the top of HomeScreen (Instagram-style)
- Auto-generate a Story when a wager is settled (winner gets a celebration card)

---

## Implementation Priority Order

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Push Notifications | High | 🔴 Critical |
| 2 | Wager Accept from Feed | Medium | 🔴 Critical |
| 3 | Other-User Profile View | Medium | 🔴 Critical |
| 4 | Notifications Screen | Medium | 🟡 High |
| 5 | Rematch Button | Low | 🟡 High |
| 6 | Leaderboard | Medium | 🟡 High |
| 7 | Post Interactions | Medium | 🟡 High |
| 8 | Dispute Flow | High | 🟡 High |
| 9 | Wager Expiry | Low | 🟡 Medium |
| 10 | Settings Screen | Low | 🟢 Medium |
| 11 | Share / Deep Link | High | 🟢 Medium |
| 12 | Rich Media in Chat | Medium | 🟢 Medium |
| 13 | Wallet Funding | Very High | 🟢 Low (legal risk) |
| 14 | Group Wagers | High | 🟢 Low |
| 15 | Stories / Moments | High | 🟢 Low |
