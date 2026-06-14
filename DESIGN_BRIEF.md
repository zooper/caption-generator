# AI Caption Studio — Design Brief

A brief for redesigning the UI of **AI Caption Studio**. Hand this to Claude's design feature as context. It captures what the product is, who uses it, the screens involved, the current design system, and where the design needs to improve.

---

## 1. Product in one line

A web app where a user uploads a photo and gets AI-generated **captions, hashtags, and alt text** tailored for social media (Mastodon, Pixelfed, Instagram), with optional context (camera, location, weather, mood) pulled from EXIF or entered by hand.

## 2. Who uses it

- **Photographers / creators** posting to social platforms who want fast, on-brand captions.
- **A single power user + a small invited group** — this is a multi-user app with magic-link / passkey login, not a mass-market product. Density and efficiency matter more than hand-holding.
- Used on **both desktop and mobile**. Desktop is the primary workspace (two-column generate flow); mobile must stay fully usable.

## 3. Tone & personality

- Creative and playful, but **not childish**. The current UI leans heavily on emoji in every heading and button — we want to keep a sense of fun while looking more like a polished, modern SaaS tool.
- Confident, fast, uncluttered. The user is here to get a caption and post it, not to admire the UI.
- Should feel trustworthy enough to hold an account and post to social platforms on the user's behalf.

## 4. Screens to design

| Screen | File | Purpose |
|--------|------|---------|
| **Main / Generate** | `public/index.html` | Core flow: upload image → pick style → add context → generate → review caption/hashtags/alt text → copy or post/schedule |
| **Auth / Login** | `public/auth.html` | Passkey-first login with magic-link fallback; also handles invite acceptance |
| **Settings** | `public/settings.html` | Account, theme picker, passkey management, recovery codes, social-platform config, templates |
| **Admin Dashboard** | `public/admin.html` | Stats, invites, tiers (admin only) |
| **Admin — Users** | `public/admin-users.html` | User management table |
| **Admin — Tiers** | `public/admin-tiers.html` | Usage-tier management |
| **Lightroom Images** | `public/lightroom.html` | Browse images imported from a Lightroom plugin |
| **Privacy** | `public/privacy.html` | Static privacy policy |

Priority for the redesign: **Main/Generate first**, then **Auth** and **Settings**. Admin screens are functional tables and can follow the same system without bespoke work.

## 5. Core user flow (Main screen)

1. **Header** — app title + a row of nav entries: Admin, Caption Library, Lightroom Images, Scheduled Posts, Plugin, Settings, Logout.
2. **Upload area** — large drag-and-drop dropzone ("Drop your image here"), click-to-browse, shows a preview thumbnail once a file is chosen. Max 10MB.
3. **Choose Caption Style** — pill buttons, single-select: ✨ Creative, 💼 Professional, 😄 Casual, 🔥 Trendy, 💭 Inspirational, 😂 Humorous, 🖤 Edgy.
4. **Add Context (optional, collapsible)** — text fields: Camera/Gear, Event/Occasion, Location, Mood/Vibe, Subject/Focus, Custom Notes; plus an "Include Weather Data" toggle. Several fields auto-populate from EXIF.
5. **Generate** — primary action button; shows a loading state while the AI runs.
6. **Generated Content** (results) — three blocks: **Caption**, **Hashtags**, **Alt Text**, each with a Copy button. Plus actions: **Schedule Post** and direct **Post to Mastodon / Pixelfed / Instagram**.
7. **Schedule modal** — date & time, platform multi-select, optional custom caption/hashtags override, Cancel / Schedule Post.

Current desktop layout is a **two-column grid**: upload + options on the left, results on the right.

## 6. Current design system (what exists today)

Implemented as **CSS custom properties** in `public/themes.css`, consumed by `public/styles.css`. The redesign should preserve this theming mechanism (see Constraints).

**Theming:** 6 named themes selectable in Settings — 3 light (Purple Creative [default], Ocean Breeze, Sunset Warm) and 3 dark (Dark Purple, Dark Ocean, Dark Forest). Each defines a primary gradient, background gradient, accent color, and text/card/border colors.

**Default theme (Purple Creative) tokens:**
```
--primary-gradient:    linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)   /* violet → pink */
--background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)   /* indigo → purple */
--accent-color:        #8B5CF6
--text-primary:        #333
--text-secondary:      #666
--card-background:     #ffffff
--border-color:        #e1e5e9
--shadow-color:        rgba(0,0,0,0.1)
```

**Current visual language:**
- Full-bleed gradient background; white rounded "cards" (`border-radius: 20px`) floating on top with soft drop shadows (`0 10px 30px`).
- Gradient header banner with large centered title.
- Pill-shaped style buttons (`border-radius: 25px`), dashed-border dropzone.
- System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto…`). No custom typeface.
- Heavy emoji use as iconography throughout.

**Component inventory to cover:** header/nav, gradient hero, card container, drag-drop upload zone (idle / hover / dragover / preview states), selectable pill buttons, text inputs + textareas with labels, toggle/checkbox, primary/secondary/danger/success buttons, result blocks with copy buttons, modal dialog, data tables (admin), notifications/toasts (success/error/info variants already tokenized), tabs/nav links, theme picker.

## 7. What's wrong / goals for the redesign

- **Emoji-as-icons everywhere** looks amateur and renders inconsistently across platforms. Replace with a real icon set (or a restrained, consistent emoji usage) — but keep the playful spirit.
- **Generic "gradient + white card" look** reads as a 2020 template. Wanted: a more distinctive, modern, editorial feel that still works as a tool.
- **Visual hierarchy is flat** — every section is the same white card with the same shadow. The primary flow (upload → generate → results) should read clearly; secondary context should recede.
- **Typography is undifferentiated** — default system font at a few sizes. Wanted: a deliberate type scale and possibly a display typeface for headings.
- **Density** — there's a lot of vertical scrolling on the main screen; tighten spacing and make the two-column flow more efficient on desktop.
- **Results presentation** is plain text blocks; the generated caption/hashtags/alt-text deserve a more considered, scannable, copy-friendly treatment.
- Keep **dark themes first-class**, not an afterthought.

## 8. Hard constraints (do not break these)

- **Vanilla HTML/CSS/JS only.** No build step, no framework, no bundler. Files are served as static assets from `/public` by a Cloudflare Worker.
- **Theming must stay token-driven** via CSS custom properties so the 6 themes + the theme switcher keep working. New design tokens are welcome; the `--variable` mechanism must remain.
- **Mobile-first / responsive.** The two-column desktop layout must collapse to a single column on mobile and stay fully usable.
- **Accessibility matters** — this app literally generates alt text. Proper labels, focus states, color contrast (especially on gradients), and keyboard navigation are required.
- Existing class names are referenced from JS in the HTML files; either keep key hooks or expect to update the markup/JS alongside the CSS.

## 9. Deliverable wanted from design

A refreshed visual design — ideally as **HTML/CSS mockups or a component sheet** covering the components in §6 — that I can port into the static files. Show: the Main/Generate screen, the Auth screen, and the Settings screen, in both a light and a dark theme, plus the shared component set (buttons, inputs, cards, upload zone, result blocks, modal, notifications).
