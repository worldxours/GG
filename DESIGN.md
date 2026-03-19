# GoodGame — Design System Reference

> **Source of truth:** `/Users/Shared/RunIt/runit_prototype.html`
> Every screen in the React Native build must match this prototype visually.
> When in doubt, open the prototype and compare side-by-side.

---

## 1. Design Language

**Style:** Neomorphic dark — surfaces appear physically raised or pressed into a dark background using layered shadows. Nothing is flat. There is always a shadow.

**Key principles:**
- Raised elements (cards, FAB, icon buttons): dual shadow — dark shadow bottom-right + light shadow top-left + subtle glow
- Pressed/active elements (active nav item, selected category, filled input): inset shadow, background drops to `bg` color
- Accent color (`c1`) drives glow, active states, amounts, and CTA buttons
- Typography is a strict two-font system: **Syne** for numbers/headings, **Inter** for all body/labels

---

## 2. Color Tokens

### Default theme (no team selected)
```ts
bg:          '#0e1015'   // phone shell background
raised:      '#161920'   // card / surface background
border:      '#1e2330'   // subtle divider / border
shadowDark:  '#070a0f'   // dark part of neomorphic shadow (sd)
shadowLight: '#1e2535'   // light part of neomorphic shadow (sl)

c1:          '#8b5cf6'   // primary accent — purple
c2:          '#3b82f6'   // secondary accent — blue

glowSoft:    'rgba(139,92,246,0.06)'   // very subtle ambient
glowMid:     'rgba(139,92,246,0.18)'   // medium ambient on big cards
glowSoft2:   'rgba(139,92,246,0.07)'   // secondary glow (often c2-tinted)
glowMid2:    'rgba(139,92,246,0.18)'   // active state mid glow
glow1:       'rgba(139,92,246,0.45)'   // tight point glow (notification pip, toggle)

text:        '#e8eaf0'   // primary text
dim:         '#8892a4'   // secondary text (captions, descriptions)
muted:       '#4a5568'   // tertiary (labels, placeholders, inactive)
divider:     '#1e2330'   // list separators

vs:          'rgba(139,92,246,0.22)'   // VS badge in chat/wager (semi-transparent accent)

btn:         '#8b5cf6'            // CTA button background (solid for default theme)
btnShadow:   '5px 5px 16px rgba(139,92,246,0.5), -2px -2px 10px #1e2535, 0 0 28px rgba(139,92,246,0.25)'
btnText:     '#ffffff'            // CTA button text

youGrad:     'linear-gradient(135deg, #8b5cf6, #6d28d9)'  // current user avatar gradient

win:         '#22c55e'   // or #5EDDB8 for settled-win
loss:        '#ef4444'   // or #F97878 for settled-loss
pending:     '#f59e0b'   // or #F9C74F
```

### Team themes
Each team overrides all tokens above. Stored in `src/theme/teams.ts`.

| Team | c1 | c2 | bg |
|---|---|---|---|
| Knicks | `#006BB6` | `#F58426` | `#151A26` |
| Canucks | `#00205B` | `#00843D` | `#0C1220` |
| Flames | `#CE1126` | `#F1BE48` | `#1A1010` |
| Raiders | `#A5ACAF` | `#C8CDD0` | `#0D0D0D` |
| Eagles | `#004C54` | `#A5ACAF` | `#080F10` |
| 49ers | `#AA0000` | `#B3995D` | `#140606` |

---

## 3. Typography

### Fonts
```
Syne_800ExtraBold  → all numbers, wordmark, wager amounts, screen titles
Syne_700Bold       → section headings, card titles, topbar title
Inter_600SemiBold  → body text, button labels, names
Inter_500Medium    → captions, meta, descriptions
```

### Scale (exact sizes from prototype)
```
Wordmark (auth):      48px  Syne 800  letterSpacing:4
Wordmark (topbar):    24px  Syne 800  letterSpacing:2
Screen title:         20px  Syne 700  letterSpacing:1
Balance number:       48px  Syne 800  letterSpacing:-1
Wager amount lg:      32px  Syne 800
Wager amount md:      20px  Syne 700
Wager amount sm:      18px  Syne 700
Card amount:          16px  Syne 700
VS badge:             10px  Syne 800  letterSpacing:2  uppercase

Body primary:         13-15px  Inter 600
Body secondary:       12-13px  Inter 500  color:dim
Section label:        10px     Inter 700  letterSpacing:1.8  UPPERCASE  color:muted
Meta / timestamps:    10-11px  Inter 600  color:muted
Status badge:         9px      Inter 700  letterSpacing:0.5  UPPERCASE
```

---

## 4. Neomorphic Shadow System

React Native only supports a **single shadow per element**. To replicate the prototype's dual-shadow neomorphic look, use these strategies:

### Raised surface (cards, FAB, icon buttons)
```ts
// Use the "dominant" shadow (dark, bottom-right)
// + rely on backgroundColor contrast for the lighter highlight
shadowColor: Colors.shadowDark,
shadowOffset: { width: 6, height: 6 },
shadowOpacity: 1,
shadowRadius: 14,
elevation: 8,        // Android
// Add a borderWidth + borderColor for subtle edge highlight on iOS:
borderWidth: 1,
borderColor: Colors.border,
```

### Inset / pressed / active state
```ts
// Cannot do true CSS inset shadow in RN.
// Simulate with:
backgroundColor: Colors.bg,       // drop to darker bg
borderWidth: 1,
borderColor: Colors.border,
// For active inputs and pressed tabs, this bg swap is the key visual cue
```

### Glow (accent cards, CTA button)
```ts
shadowColor: Colors.c1,
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.4,
shadowRadius: 16,
elevation: 8,
```

### Reference shadow styles by element type
| Element | Background | Shadow style |
|---|---|---|
| Card (raised) | `raised` | dark shadow 6,6 / radius 14 + border |
| Active/inset card | `bg` | border only |
| Input field | `bg` | border only (inset feel) |
| CTA button | `c1` gradient | c1 glow shadow |
| Secondary button | `bg` | border + slight dark shadow |
| Bottom nav container | `raised` | dark shadow 8,8 + border |
| Active nav item | `bg` | border |
| FAB | `c1` | c1 glow shadow |
| Icon button | `raised` | dark shadow 4,4 + border |

---

## 5. Border Radius

```ts
Radius = {
  xs:   8,    // status badges, small pills
  sm:   10,   // avatar sm
  md:   14,   // avatar md, secondary buttons, date/amount chips
  lg:   16,   // input fields, small cards
  card: 22,   // standard card (most cards in prototype)
  xl:   24,   // large cards (balance card, preview card)
  nav:  26,   // bottom nav pill
  fab:  17,   // FAB button (square-ish, not circle)
  av:   {     // avatar by size
    sm: 10,   // 28x28 → borderRadius 9
    md: 14,   // 44x44 → borderRadius 14
    lg: 18,   // 56x56 → borderRadius 18
    profile: 22, // 72x72 → borderRadius 22
  },
  sheet: 28,  // bottom sheet top radius
  full:  9999,
}
```

---

## 6. Spacing

```ts
Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  20,   // NOTE: prototype uses 20px horizontal padding (not 24px)
  xl:  24,
  xxl: 32,
}
```

> **Important:** The prototype's standard horizontal screen padding is **20px**, not 24px. Use `Spacing.lg = 20` for screen edges.

---

## 7. Component Patterns

### Screen layout
```
StatusBar (9:41 / signal — system on native, omit on web)
Screen content (flex: 1, overflow hidden)
Bottom Nav (floating pill, margin: 16px 20px 0)
```

### Top bar
```tsx
// Prototype pattern:
<View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:'18px 20px 0' }}>
  <Text style={{ fontFamily: Syne700, fontSize: 20, letterSpacing: 1 }}>TITLE</Text>
  <View style={{ flexDirection:'row', gap:10 }}>
    {/* icon buttons here */}
  </View>
</View>
```

### Section label
```tsx
<Text style={{
  fontSize: 10, fontWeight: '700', letterSpacing: 1.8,
  textTransform: 'uppercase', color: Colors.muted,
  marginBottom: 12
}}>
  SECTION NAME
</Text>
```

### Card (raised)
```tsx
<View style={{
  padding: 16, borderRadius: 22,
  backgroundColor: Colors.raised,
  borderWidth: 1, borderColor: Colors.border,
  shadowColor: Colors.shadowDark,
  shadowOffset: { width: 6, height: 6 },
  shadowOpacity: 1, shadowRadius: 14, elevation: 8,
}}>
```

### Input field (inset look)
```tsx
// Prototype uses bg color (darker) with inset shadow — simulate in RN with:
<TextInput style={{
  backgroundColor: Colors.bg,        // darker than card
  borderWidth: 1, borderColor: Colors.border,
  borderRadius: 16,
  paddingHorizontal: 18, paddingVertical: 14,
  color: Colors.text, fontSize: 16,
  fontFamily: 'Inter_500Medium',
}} />
```

### Primary button (CTA)
```tsx
<TouchableOpacity style={{
  backgroundColor: Colors.c1,   // or linear gradient for team themes
  borderRadius: 18,
  paddingVertical: 14,
  alignItems: 'center',
  shadowColor: Colors.c1,
  shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 16,
  elevation: 8,
}}>
  <Text style={{ fontFamily:'Syne_800ExtraBold', fontSize:15, color:'#fff', letterSpacing:0.5 }}>
    Label
  </Text>
</TouchableOpacity>
```

### Avatar
```tsx
// Square-ish rounded corners — NOT circles
// Size sm: 32x32, borderRadius:10
// Size md: 44x44, borderRadius:14
// Size lg: 56x56, borderRadius:18
// Profile: 72x72, borderRadius:22
// Background: gradient (user-specific color) OR initials
```

### Wordmark (header / screen tops)
```tsx
// Prototype: "RUN" plain + "IT" in c1 color
<Text>
  <Text style={{ color: Colors.text }}>RUN</Text>
  <Text style={{ color: Colors.c1 }}>IT</Text>
</Text>
// Auth screen only: full word with glow textShadow
```

### Bottom nav
```tsx
// Floating pill — NOT a standard tab bar
// Container: raised bg, borderRadius:26, shadow, margin: 16 20
// Active tab: bg color (inset look), c1 label color
// Inactive tab: icon opacity 0.4, muted label
// FAB: borderRadius:17 (square-ish), c1 background + glow shadow
```

### Status badge
```tsx
// pending: color #F9C74F
// active:  color c2 (blue) + faint glow
// settled-win: color #5EDDB8
// settled-loss: color #F97878
// All: bg color + inset shadow, borderRadius:10, 9px Inter 700 uppercase
```

---

## 8. Auth Screen Specifics

The prototype auth screen:
- Wordmark: `RUN` (text color) + `IT` (c1 color), 40px Syne 800, letterSpacing:4
- Tagline: `"Wager with your friends. Settle with receipts."` — muted color, 13px
- Input fields: **inset style** (bg color, not raised), 16px Inter, full width
- CTA button: full-width, Syne 800, 15px
- Skip: muted, underline, 13px, centered
- No section labels on auth screen

**Our RN auth screen differences (acceptable for Phase 1):**
- Using email/password instead of phone+OTP (Firebase requirement)
- Sign Up / Log In toggle added (not in prototype — prototype was phone-only)
- Input styling should use `bg` color + border (not `raised`)

**Fix needed in AuthScreen.tsx:**
```
input.backgroundColor should be Colors.bg (not Colors.raised)
input.borderRadius should be 16 (not Radius.md = 12)
```

---

## 9. Screen-by-Screen Notes

### Home (social feed)
- Header: RUNIT wordmark left + notif bell + avatar right
- Balance card: large, raised, glow — balance in 48px Syne 800, stats as inset pills
- Active wagers: horizontal scroll cards (155px wide, 20px radius)
- Feed: social post cards (22px radius), photo/meme/activity post types

### Wagers
- Tabs: All / Active / Pending / Settled — tab-row with inset active state
- Wager cards: 20px radius, raised, amount in c1 color 18px Syne 700
- Status badges: 9px uppercase, inset bg

### Chat
- List: divider-separated rows (no card wrapper per row)
- Detail: pinned wager card at top + H2H banner + message bubbles
- Your messages: c1/btn background, right-aligned
- Their messages: raised background, left-aligned
- Input: inset style input + send button (14px radius, c1)

### Profile
- Avatar: 72x72, borderRadius:22, youGrad background
- Stats: inset pills in a raised card
- Sub-tabs: H2H cards (horizontal scroll) + wager history (scrollable list)

### New Wager
- Opponent picker: horizontal scroll of avatar + name items
- Category chips: raised → inset when selected
- Amount chips: raised → inset when selected
- Description: inset textarea (nm-ta style)
- Preview card at bottom: shows live wager preview

---

## 10. Things NOT to do

- ❌ Don't use circular avatars (prototype uses square-ish rounded)
- ❌ Don't use a standard React Navigation tab bar appearance — the nav is a floating neomorphic pill
- ❌ Don't use `Colors.raised` for input field backgrounds — inputs use `Colors.bg` (inset look)
- ❌ Don't use flat/solid borders as the main visual depth — shadows are the depth
- ❌ Don't use `fontWeight: '800'` with Inter — only Syne gets 800 weight
- ❌ Don't use circle FAB (`borderRadius: 26`) — FAB is `borderRadius: 17`
- ❌ Don't use horizontal padding > 20px for main screen content
- ❌ Don't use a full-width white/grey line for list dividers — use `Colors.divider` at 1px
