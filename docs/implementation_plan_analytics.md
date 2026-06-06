# Implementation Plan: Analytics Layer & Traction Tracking

This document outlines the design and integration plan for a robust product analytics layer in **IE-WC-Watcher**. The primary goals are to track user retention, analyze feature usage (predictions, challenges, watchmap check-ins), and gather aggregate community data to prove turnout traction to local pubs.

---

## User Review Required

> [!IMPORTANT]
> **Data Privacy (GDPR):** Since this is an app for students (carrying university-linked emails), we must ensure that any analytics tracking is either fully anonymized or anonymizes university IDs. We recommend PostHog because it allows stripping PII (emails/names) before event ingestion.

---

## Proposed Architecture: Analytics Stack Comparison

Vercel Web Analytics is **highly restricted** on the free (Hobby) tier (limited to 2,500 page views per month). If you get even minor traction, your limits will be exhausted within days. We propose avoiding Vercel Analytics for product event tracking and using a setup that remains **100% free** under high traffic.

### Free Tier Comparison & Selection

| Provider | Free Tier Limit | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **PostHog Cloud** | **1,000,000 events/month** + 15,000 session replays | Session recordings, custom event funnels, heatmaps, cohort grouping. | Requires light SDK script injection. | **Primary Choice (Highly Recommended)**. 1M events is more than enough for thousands of active users. |
| **Google Analytics 4 (GA4)** | **Unlimited events** | 100% free forever, industry standard for traffic reports. | Harder to set up custom conversion funnels, lacks session replay/UX recording. | **Secondary Backup** (purely for long-term traffic stats). |
| **Self-Hosted Umami / PostHog** | **100% free & unlimited** (except server costs) | Complete privacy control, unlimited events. | Requires setting up an independent database/server (Render/Fly.io) and maintenance. | **Not Recommended for Launch** (overkill for World Cup duration). |
| **Vercel Analytics** | 2,500 events/month | Zero-config, lightweight. | Extremely low free limit (will crash or stop tracking quickly). | **Do Not Use** for product/traction tracking. |

### Why PostHog Cloud is our primary choice:
1. **1 Million Free Events:** Tracks up to 1,000,000 predictions, logins, check-ins, or button clicks every month at zero cost.
2. **Session Replay:** Recording user sessions (up to 15,000/month free) to see exactly how guests or students navigate the schedule and where they abandon.
3. **Custom Funnel Analysis:** Visualizes conversions directly (e.g., `Browse as Guest` -> `View Schedule` -> `Enter PIN` -> `Register` -> `Place Prediction`).
4. **Group Analytics:** Segment activity by class PIN or friend group.

---

## Implementation Details

### 1. Client-Side Provider Setup
We will wrap the application in a custom PostHog provider to initialize the script on the client-side.

#### [NEW] [PostHogProvider.tsx](file:///Users/rausan/IE-WC-Watcher/src/components/analytics/PostHogProvider.tsx)
A client component wrapper that initializes PostHog using environment variables.

```tsx
"use client";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: true, // Automatically track page views
    capture_pageleave: true,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

#### [MODIFY] [layout.tsx](file:///Users/rausan/IE-WC-Watcher/src/app/layout.tsx)
Wrap the root body in `PostHogProvider` to enable universal tracking.

---

### 2. User Identification & Profile Linking
To track retention accurately, we need to associate anonymous sessions with logged-in students without leaking their emails:
* **Identification trigger:** When a user logs in or registers, call `posthog.identify(user.id)`.
* **Anonymized traits:** Set traits like `{ isGuest: true/false, teamId: "...", hasBoughtIn: true/false }`. Avoid pushing the direct email or password.

---

### 3. Key Events & Funnels to Track

We will instrument code checkpoints to capture critical user actions.

| Event Name | Trigger Location | Context Logged | Purpose |
| :--- | :--- | :--- | :--- |
| `prediction_submitted` | `PredictionForm.tsx` | `matchId`, `isUpdate: bool` | Measures schedule interaction frequency. |
| `challenge_created` | `ChallengeModal.tsx` | `opponentId`, `stakeTokens` | Tracks 1-on-1 betting engagement. |
| `group_joined` | `/api/groups/join` | `groupId` | Measures group-based network growth. |
| `guest_upgraded` | `/account/page.tsx` | `userId` | Funnel analysis for guest-to-member conversions. |
| `watch_rsvp` | Event details page | `eventId`, `venueId`, `partySize` | **Traction Proof:** Gathers numbers to pitch to pubs. |
| `live_report_created`| `liveReports` submit | `venueId`, `statusType` | Tracks real-time pub attendance signals. |

---

## Proving Traction to Pubs: The "Pub Outreach" Funnel
With PostHog, we will build a custom dashboard showing aggregate traction charts to present to pub owners:

```mermaid
graph TD
    A["Active Local Fans (GPS/City)"] -->|RSVP Event| B["RSVPs for Sunday Match (Count + Group Size)"]
    B -->|Cross Threshold (e.g. 15+)| C["Trigger Broadcast Request Email to Pub Owner"]
    C -->|Owner Approves| D["Event marked 'Confirmed Broadcaster' in App"]
    D -->|Push Notification| E["Notify RSVP'd fans to arrive"]
```

This analytics framework acts as the foundation to validate product market fit during the World Cup, giving you concrete data (e.g. *"We have 142 active users in this post-code who watch matches weekly"*) to sign up partner pubs.
