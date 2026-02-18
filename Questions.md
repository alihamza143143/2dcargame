# Johnson McGinnis Game - Client Information Request

## Overview
The "Choose Your Path" interactive estate planning game is **97% complete**. To finalize deployment and launch, we need the following information from your team.

---

## 🔴 CRITICAL - Required Before Launch

### 1. **reCAPTCHA Verification**

**What:** Site Key and Secret Key for spam/bot protection on the email form

**How to Get:**
1. Go to: https://www.google.com/recaptcha/admin
2. Click **"Create" or "+" button**
3. Set up new site:
   - **Label:** Johnson McGinnis Choose Your Path Game
   - **reCAPTCHA Type:** reCAPTCHA v2 → "I'm not a robot" Checkbox
   - **Domains:** yoursite.com (and any subdomains)
4. Click **Submit**

**Provide to Developer:**
- [ ] **reCAPTCHA Site Key** (public, visible in code)
- [ ] **reCAPTCHA Secret Key** (keep private, server-side only)

**Timeline:** 5 minutes to set up

---

### 2. **Lead Capture Integration**

Choose **ONE** option:

#### **Option A: Zapier (RECOMMENDED - Simplest)**

**Why:** Zero coding, connects to any platform (Mailchimp, CRM, email, etc.)

**Setup Steps:**
1. Sign up free: https://zapier.com
2. Create new Zap → **Trigger: Webhooks by Zapier** → **Catch Raw Hook**
3. Copy the **Webhook URL** (looks like: `https://hooks.zapier.com/hooks/catch/123456/abcdefg/`)
4. (Optional) Add **Action:** Send to Mailchimp list, email, CRM, Slack, etc.

**Provide to Developer:**
- [ ] **Zapier Webhook URL**

**Timeline:** 10 minutes

---

#### **Option B: Direct Mailchimp API**

**Why:** Direct integration, more control

**Setup Steps:**
1. In Mailchimp account → **Account Settings** → **Extras** → **API keys**
2. Generate new API key
3. Find your **Audience ID** (Audience → Settings → Audience name & defaults)

**Provide to Developer:**
- [ ] **Mailchimp API Key** (format: `abc123def456-us1`)
- [ ] **Server Prefix** (from API key, e.g., `us1`, `us2`, etc.)
- [ ] **Audience List ID** (e.g., `a1b2c3d4e5`)

**Timeline:** 15 minutes

---

## 🟡 IMPORTANT - Review & Finalize

### 3. **Estate Planning Scenarios**

**Current Status:** 6 scenarios created for each profile (Senior & Adult Child)

**Topics Covered:**
- Dementia diagnosis & early planning
- Health crisis & medical decisions
- Remarriage & blended families
- Estate planning & wills/trusts
- Long-term care & Medicaid
- Probate & inheritance

**Request:**
- [ ] Please review the scenarios in the game
- [ ] Confirm the questions and answers are accurate for Tennessee law
- [ ] Provide any rewording needed for your firm's messaging
- [ ] Confirm any estate planning topics you want to add/remove

**Timeline:** Review & feedback (1-2 hours)

---

### 4. **Company Information**

**Please Confirm:**
- [ ] **Website URL** for "Contact Johnson McGinnis" button (currently: johnsonmcginnis.com)
- [ ] **Phone Number** (optional, can add to end screen)
- [ ] **Office Address** (optional, can add to parking lot scene)
- [ ] **Brand Colors** preference (currently: deep blue + warm bronze + gold accents) — approve or adjust

**Timeline:** 10 minutes

---

### 5. **Branding & Visual Elements**

Per specifications, we have several branding touchpoints ready. Please confirm preferences:

**Logo Placement:**
- [ ] **Landing screen:** Add company logo? (Yes/No)
- [ ] **During gameplay:** Show logo on billboards along the road? (Yes/No)
- [ ] **End screen only:** Logo appears at finish only? (Currently: Yes)

**Billboard Content:**
The game includes roadside billboards as subtle branding elements.
- [ ] **Billboard text:** What should billboards display? Options:
  - Company name only ("Johnson McGinnis")
  - Tagline ("Elder Law & Life Care Planning")
  - Call-to-action ("Plan Your Future Today")
  - Leave blank (decorative only)

**Car Styling:**
Per specs: "Station-wagon cars: Not sporty or modern; classic, family-oriented vehicles"
- [ ] **Current car color:** Deep burgundy red — Approve or specify different color
- [ ] **Car style:** Classic station wagon — Approve or request different style

**Timeline:** 10 minutes

---

## 🟢 OPTIONAL - Enhancements

### 6. **Additional Customizations**

**If desired, we can:**
- [ ] Add actual office building photo to parking lot scene
- [ ] Add scenario for specific practice areas

**Audio Options:**
- [ ] Add background music (soft, professional ambient)
- [ ] Add driving sounds (engine, road)
- [ ] Add feedback sounds (correct/incorrect answer chimes)

**Difficulty Levels:**
- [ ] Create different difficulty modes (Easy/Medium/Hard with varying time pressure or question complexity)

---

### 7. **Analytics & Tracking (Recommended)**

**For measuring game effectiveness:**
- [ ] **Google Analytics:** Provide GA4 Measurement ID (format: `G-XXXXXXXXXX`) to track:
  - Game starts, completions, drop-off points
  - Score distributions
  - Profile selection breakdown
- [ ] **Facebook Pixel:** Provide Pixel ID for conversion tracking (optional)
- [ ] **No tracking needed** — Skip analytics

**Timeline:** 5 minutes if already set up

---

## 📋 Checklist for Client to Complete

**Before we can launch:**
- [ ] Provide reCAPTCHA keys (critical)
- [ ] Choose lead capture method: **Zapier** or **Mailchimp** (critical)
- [ ] Provide chosen integration credentials (critical)
- [ ] Review & approve estate planning scenarios (important)
- [ ] Confirm company info & branding (important)
- [ ] Confirm branding preferences (logo, billboards, car) (important)

---

## 📧 Submission Format

**Please compile all answers in one email:**

```
RECAPTCHA:
- Site Key: [YOUR_SITE_KEY]
- Secret Key: [YOUR_SECRET_KEY]

LEAD CAPTURE:
- Method: [ZAPIER or MAILCHIMP]
- Zapier Webhook URL: [URL] OR Mailchimp API Key: [KEY], Server Prefix: [PREFIX], Audience ID: [ID]

SCENARIOS:
- Approved as-is / Revisions: [LIST ANY CHANGES]

COMPANY INFO:
- Website: [URL]
- Phone: [PHONE or N/A]
- Colors approved: Yes / Adjustment needed: [DESCRIBE]

BRANDING:
- Logo on landing screen: [YES/NO]
- Logo on billboards: [YES/NO]
- Billboard text: [COMPANY NAME / TAGLINE / CTA / BLANK]
- Car color approved: [YES / SPECIFY COLOR]

ANALYTICS (Optional):
- Google Analytics ID: [G-XXXXXXXXXX or N/A]
- Facebook Pixel ID: [ID or N/A]
```

---

## 📞 Questions?

If you need clarification on any of these, please reach out. We're ready to deploy as soon as we receive the critical information.

**Expected launch time after receiving all info:** 24 hours

---

## 🎮 Game Preview

The game includes:
- ✅ Professional 3D driving experience (Babylon.js engine)
- ✅ Tennessee-themed scenery (road, barns, trees, hills)
- ✅ Station wagon car with perspective view
- ✅ 6 decision points at intersections
- ✅ Email capture with reCAPTCHA validation
- ✅ Profile selection (Senior / Adult Child)
- ✅ Personalized scenarios based on profile
- ✅ Real-time feedback on choices
- ✅ Score tracking & end-of-game messaging
- ✅ Lead routing to Mailchimp/Zapier
- ✅ Mobile responsive design
- ✅ Professional UI with smooth animations
- ✅ ~60 seconds playtime (per spec)

**No further development needed** — just integrations to finalize.
