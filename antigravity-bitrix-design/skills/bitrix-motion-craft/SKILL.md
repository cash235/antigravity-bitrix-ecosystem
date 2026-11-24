---
name: bitrix-motion-craft
description: >
  Motion design engineering, GPU-safe CSS/JS animation performance, mobile gesture craft, and
  animation restraint/removal for 1C-Bitrix frontends. Adapted from emilkowalski/skills
  (animation-performance, review-animations, remove-animations, mobile-native, gestures) to keep
  Core Web Vitals (INP, CLS, LCP) fast on real mobile devices.
---

# 1C-Bitrix Motion Craft & Animation Performance (`bitrix-motion-craft`)

Use this skill when adding, reviewing, or stripping animations, drawers, modals, filter accordions, cart feedback, or mobile interactions in 1C-Bitrix templates (`/local/templates/*/`).

---

## 1. Core Easing & Timing Rules (Vercel / Linear Craft)

| Interaction Type | Recommended Curve | Duration | Why |
|---|---|---|---|
| **Element entering** (modal, dropdown, toast, filter drawer) | `cubic-bezier(0.22, 1, 0.36, 1)` (`ease-out`) | `180–240ms` | Fast initial response makes the UI feel snappy, gentle landing feels refined. Never use `ease-in` for enters! |
| **In-place state change** (tab indicator, toggle switch, accordion) | `cubic-bezier(0.4, 0, 0.2, 1)` (`ease-in-out`) | `150–200ms` | Smooth acceleration & deceleration when already on screen. |
| **Element exiting** (closing modal/toast) | `ease-out` (faster than enter!) | `120–160ms` | Exits should get out of the user's way immediately. |
| **Hover / Press micro-feedback** | `ease-out` | `100–140ms` | Crisp response without sluggish lag. |

---

## 2. Hard Performance Rules (Protect INP & CLS)

1. **GPU-Composited Properties ONLY**:
   - Animate ONLY `transform` (`translate3d`, `scale`) and `opacity` (plus `clip-path` when justified).
   - **FORBIDDEN**: `transition: all`, animating `width`, `height`, `top`, `left`, `margin`, `padding`, or `box-shadow` on large catalog grids (triggers layout/paint thrashing and degrades mobile INP).
2. **Interruptible & Origin-Aware**:
   - Popovers/dropdowns must animate from their trigger (`transform-origin: top left` / `top right`) with subtle scale (`0.96 → 1`), never flying across the entire viewport.
   - Rapid repeated clicks (e.g., cart +/-, smart filter chips) must smoothly interrupt prior transitions without queuing delayed flickers.
3. **Mandatory Reduced Motion**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
4. **Never Delay LCP**:
   - Hero headline, main product image, price, and primary CTA MUST be immediately visible at `opacity: 1` on initial SSR paint — **never** hide above-the-fold content behind JS scroll-reveal fade-ins!

---

## 3. When to REMOVE Animations (`remove-animations` Audit)

High-frequency utilitarian workflows should feel **instant (0ms)**, not theatrical:
- Search-as-you-type dropdowns and instant smart filter updates.
- `/manager/` CRM tables, bulk stock rows, and keyboard shortcuts.
- Repeated page-navigation hover states on 50-item mega-menus.
- Remove auto-playing carousels that fight the user's scroll and inflate CLS.

---

## 4. Mobile-Native & Touch Discipline

- Use `touch-action: manipulation` on buttons/stepper controls to eliminate double-tap zoom delay.
- Lock body scroll cleanly (`overscroll-behavior: contain`) inside mobile filter/cart drawers so background catalog lists don't scroll underneath.
- Scope hover effects with `@media (hover: hover) and (pointer: fine)` so touch taps never leave stuck hover highlights on iOS/Android.
