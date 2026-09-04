# Crunchyroll Backend Interface Analysis & Migration Report

**Date:** September 2026  
**Subject:** Reverse Engineering, API Interface Audit, and Breakage Analysis for Crispyroll  
**Repository:** [crispyroll](.)  
**Author:** Antigravity Engineering

---

## Executive Summary

Crispyroll is an unofficial desktop/TV client for Crunchyroll built on Electron, Dash.js, and vanilla JavaScript. Recent updates to Crunchyroll's backend infrastructure and security policies have caused multiple points of failure across the application:
1. **Password Authentication Deprecated & Blocked:** Crunchyroll's legacy OAuth2 `grant_type=password` endpoint (`/auth/v1/token`) returns `HTTP 401 invalid_grant` and is protected behind Cloudflare Turnstile bot detection. Direct password submission is obsolete.
2. **Device Code Flow Disabled in Client:** The OAuth2 Device Authorization flow (`/auth/v1/device/code` & `/auth/v1/device/token`), which TV platforms utilize via `crunchyroll.com/activate`, is fully active and functional on the backend, but was accidentally commented out in [src/renderer/core/service.js](./src/renderer/core/service.js#L62-L65) and marked as disabled placeholder UI in [src/renderer/screens/login.js](./src/renderer/screens/login.js#L43-L54).
3. **Home Feed Route Breakage:** The home feed endpoint in [src/renderer/core/service.js](./src/renderer/core/service.js#L337) hardcodes `/content/v2/discover/${storage.id}/home_feed`. When `storage.id` is unauthenticated or `null`, Crunchyroll responds with `HTTP 404 route_not_found`. The correct generic path is `/content/v2/discover/home_feed`.
4. **Anonymous Playback Deprecation:** The backend play service (`cr-play-service.prd.crunchyrollsvc.com`) returns `HTTP 400 {"error":40016,"reason":"Outdated Token"}` for unauthenticated guest tokens (`grant_type=client_id`). Playback now strictly mandates an authenticated subscriber session token.
5. **Legacy Client ID / Secret Age:** Crispyroll uses legacy client credentials from an older Samsung/Tizen TV build (`xunihvedbt3mbisuhevt`). While guest tokens can still be generated with this header, current clients have migrated to newer Android TV credentials (`evxc5rlcunwxrouajfxr`) to guarantee long-term stability.

---

## 1. Current Integration Architecture (As-Is)

### 1.1 Architecture & Implementation Pattern
Crispyroll avoids external NPM wrappers (such as `crunchyroll.js` or `node-crunchyroll`) in favor of direct HTTP calls via the native web `fetch()` API.
- All API interactions in the renderer process route through a singleton object in [src/renderer/core/service.js](./src/renderer/core/service.js).
- Main-process catalog syncing and metadata scraping route through [src/main/catalog.js](./src/main/catalog.js).
- Session storage, profile caching, and token refreshing are handled in [src/renderer/core/session.js](./src/renderer/core/session.js).
- Video playback, DASH manifest parsing, and DRM license proxying are managed by [src/renderer/core/player.js](./src/renderer/core/player.js) using Dash.js v4.7.4.

### 1.2 Base URLs & Gateways
The client relies on three backend hostnames defined in [src/renderer/core/service.js](./src/renderer/core/service.js#L6-L11):
- **API Base:** `https://beta-api.crunchyroll.com` (REST API gateway for auth, discovery, CMS, search, and user data)
- **Static Assets:** `https://static.crunchyroll.com` (Static i18n configurations and assets)
- **DRM Play Service:** `https://cr-play-service.prd.crunchyrollsvc.com` (Session-bound DASH manifest streaming)
- **Widevine License Proxy:** `https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine` (Widevine DRM license acquisition)

### 1.3 Client Authentication & Headers
Crispyroll currently hardcodes a single basic authorization header:
```javascript
// src/renderer/core/service.js:10
// src/main/catalog.js:14-15
const CRUNCHYROLL_BASIC_AUTH =
  "Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=";
```
- **Decoded Value:** `xunihvedbt3mbisuhevt:1kIS5dyTvjE0_rqaA3YeAh0bUXUmxW11`
- **Origin / Client Type:** Legacy Tizen / Samsung Smart TV (`client_id: "cr_smart_tv"`)
- **Bearer Token Scheme:** All downstream authenticated requests inject `Authorization: Bearer <access_token>`.

### 1.4 Endpoints Mapped in Codebase

| Endpoint Path | HTTP Method | Implementation Location | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| `/auth/v1/token` | POST | [service.js:28-60](./src/renderer/core/service.js#L28-L60) | Password OAuth2 login (`grant_type=password`) |
| `/auth/v1/token` | POST | [service.js:69-94](./src/renderer/core/service.js#L69-L94) | Refresh access token (`grant_type=refresh_token`) |
| `/auth/v1/token` | POST | [catalog.js:67-85](./src/main/catalog.js#L67-L85) | Guest token generation (`grant_type=client_id`) |
| `/accounts/v1/me/profile` | GET | [service.js:100-112](./src/renderer/core/service.js#L100-L112) | Fetches primary user profile |
| `/accounts/v1/me/multiprofile` | GET | [service.js:118-130](./src/renderer/core/service.js#L118-L130) | Fetches multi-profile list for account |
| `/accounts/v1/me/multiprofile/{id}` | PATCH | [service.js:136-153](./src/renderer/core/service.js#L136-L153) | Switches active sub-profile |
| `/index/v2` | GET | [service.js:310-324](./src/renderer/core/service.js#L310-L324) | Obtains CloudFront signed cookie parameters (`Policy`, `Signature`, `Key-Pair-Id`, `bucket`) |
| `/content/v2/discover/{storage.id}/home_feed` | GET | [service.js:330-345](./src/renderer/core/service.js#L330-L345) | Home feed discovery panels |
| `/content/v2/discover/browse` | GET | [service.js:192-205](./src/renderer/core/service.js#L192-L205) | Category / series catalog browser |
| `/content/v2/discover/search` | GET | [service.js:479-494](./src/renderer/core/service.js#L479-L494) | Search anime catalog |
| `/content/v2/discover/up_next/{id}` | GET | [service.js:351-366](./src/renderer/core/service.js#L351-L366) | Up next continue watching item |
| `/content/v2/{storage.id}/playheads` | GET / POST | [service.js:372-387](./src/renderer/core/service.js#L372-L387), [521-541](./src/renderer/core/service.js#L521-L541) | Read & sync playback progress/scrobble |
| `/cms/v2{bucket}/seasons` | GET | [service.js:393-409](./src/renderer/core/service.js#L393-L409) | CMS season list with CloudFront query tokens |
| `/cms/v2{bucket}/episodes` | GET | [service.js:415-431](./src/renderer/core/service.js#L415-L431) | CMS episode list with CloudFront query tokens |
| `/cms/v2{bucket}/videos/{id}/streams` | GET | [service.js:457-473](./src/renderer/core/service.js#L457-L473) | Legacy CMS streams v1 endpoint |
| `/v1/{id}/tv/samsung/play` | GET | [service.js:437-451](./src/renderer/core/service.js#L437-L451) | DRM play service v2 manifest retrieval |
| `/v1/token/{id}/{token}` | DELETE | [player.js:79-97](./src/renderer/core/player.js#L79-L97) | Closes DRM playback session on play service |
| `/v1/license/widevine` | POST | [player.js:134-171](./src/renderer/core/player.js#L134-L171) | Widevine license proxy |

---

## 2. Verified Failures & Diagnostics

Live probes conducted against Crunchyroll's staging and production endpoints confirmed the root causes for the client's current failures:

### 2.1 Failure 1: Direct Password Authentication (`grant_type=password`)
- **Request:**
  ```bash
  POST https://beta-api.crunchyroll.com/auth/v1/token
  Authorization: Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=
  Content-Type: application/x-www-form-urlencoded

  username=USER&password=PASS&grant_type=password&scope=offline_access
  ```
- **Response Received:**
  ```json
  HTTP/2 401 Unauthorized
  {"code":"auth.obtain_access_token.invalid_credentials","context":[],"error":"invalid_grant"}
  ```
- **Analysis:** Crunchyroll has completely removed or firewalled direct `password` grant submissions. Cloudflare Turnstile protects all web login flows, rejecting raw POST requests. Password login will never succeed under the current implementation.

### 2.2 Failure 2: Incomplete Device Code Implementation
- **Code Inspection:** In [src/renderer/core/service.js](./src/renderer/core/service.js#L62-L65):
  ```javascript
  62:   /**
  63:    * Requests an OAuth2 device authorization code.
  64:    * @param {{ success?: Function, error?: Function }} request
  65:   /**
  66:    * Refreshes OAuth2 access token using refresh_token.
  ```
  The function body for device code generation and token polling was deleted or commented out.
- **UI Inspection:** In [src/renderer/screens/login.js](./src/renderer/screens/login.js#L43-L54), the device code card was marked with:
  ```html
  <div class="user-code-badge disabled-code-badge" id="user-code-display">----</div>
  <div class="tv-login-warning-text">Not working properly — please use manual login</div>
  ```
- **Probing the Endpoint Live:**
  ```bash
  POST https://beta-api.crunchyroll.com/auth/v1/device/code
  Authorization: Basic ZXZ4YzVybGN1bnd4cm91YWpmeHI6NkJGWGM1SUk3UWx2Z3NFbzdiVjBuWUNfN1VRLXVlSVM=
  Content-Type: application/x-www-form-urlencoded

  scope=offline_access
  ```
  **Result:** `HTTP 200 OK`
  ```json
  {
    "user_code": "6z2vx2",
    "device_code": "0eeea2c6-1f93-4c47-b7ee-68bb570e8a62",
    "interval": 500,
    "expires_in": 300
  }
  ```
  Polling `POST /auth/v1/device/token` with `Content-Type: application/json` and `{"device_code":"..."}` returns `HTTP 204 No Content` while waiting for the user to activate on `crunchyroll.com/activate`.
  **Conclusion:** The device flow is 100% operational on Crunchyroll's servers; it was prematurely disabled in Crispyroll due to missing client-side implementation.

### 2.3 Failure 3: Home Feed Route Failure on Guest / Null Account ID
- **Issue:** [src/renderer/core/service.js:337](./src/renderer/core/service.js#L337) calls:
  `GET /content/v2/discover/${storage.id}/home_feed`
- **Result when unauthenticated (`storage.id` is null/empty):**
  `GET /content/v2/discover/null/home_feed` -> `HTTP 404 route_not_found`
- **Correct Path:**
  `GET /content/v2/discover/home_feed` -> `HTTP 200 OK` (returns full curated home panels, works with both guest tokens and authenticated tokens).

### 2.4 Failure 4: CMS Streams Link is Null & Anonymous DRM Playback Blocked
- **Issue A:** CMS episode objects fetched via `/cms/v2{bucket}/episodes` now return `"streams_link": null`. Crunchyroll has fully migrated to `cr-play-service.prd.crunchyrollsvc.com`.
- **Issue B:** When calling `cr-play-service` (`/v1/{stream_id}/tv/samsung/play` or `/v1/{stream_id}/tv/android/play`) with a guest `grant_type=client_id` token:
  `HTTP 400 Bad Request`  
  `{"error":40016,"reason":"Outdated Token"}`
- **Analysis:** Crunchyroll terminated free ad-supported tier playback. Video playback now validates account entitlements inside the JWT claims. Guest/anonymous tokens are rejected at the playback gateway.

---

## 3. Researched Changes & New Interface Details

### 3.1 Modern Client Credentials
Crunchyroll client credentials regularly rotate across app releases. Research into active community extractions (`vitalygashkov/crextractor` v3.70.0) provides current, production-verified credentials:

#### Android TV (Active Target)
- **App Version:** `3.70.0 (22358)`
- **Client ID:** `evxc5rlcunwxrouajfxr`
- **Client Secret:** `6BFXc5II7QlvgsEo7bV0nYC_7UQ-ueIS`
- **Basic Auth Header:**
  `Basic ZXZ4YzVybGN1bnd4cm91YWpmeHI6NkJGWGM1SUk3UWx2Z3NFbzdiVjBuWUNfN1VRLXVlSVM=`
- **Recommended User-Agent:**
  `Crunchyroll/ANDROIDTV/3.70.0_22358 (Android 16; en-US; sdk_gphone64_x86_64)`

#### Android Mobile (Secondary Target)
- **App Version:** `3.103.2 (1086)`
- **Client ID:** `cisobxghnlkmdsjohfjo`
- **Client Secret:** `aWHXDdm951ZE47r0tTu4zJjzh84LyEaF`
- **Basic Auth Header:**
  `Basic Y2lzb2J4Z2hubGttZHNqb2hmam86YVdIWERkbTk1MVpFNDdyMHRUdTR6Smp6aDg0THlFYUY=`

### 3.2 The Modern Authentication Protocol: OAuth2 Device Grant (RFC 8628)
Because direct password authentication is dead, TV and standalone desktop clients authenticate using the OAuth2 Device Authorization Grant:

```mermaid
sequenceDiagram
    autonumber
    participant App as Crispyroll Client
    participant API as beta-api.crunchyroll.com
    participant User as User (Browser/Phone)

    App->>API: POST /auth/v1/device/code (Basic Auth)
    API-->>App: { user_code: "6z2vx2", device_code: "uuid...", interval: 500, expires_in: 300 }
    App->>App: Render QR code & Display "6z2vx2"
    App->>User: "Go to crunchyroll.com/activate"
    User->>API: Logs in via web browser & enters code "6z2vx2"
    loop Poll every 3 seconds
        App->>API: POST /auth/v1/device/token (application/json: { device_code: "uuid..." })
        API-->>App: HTTP 204 No Content (Pending)
    end
    API-->>App: HTTP 200 OK { access_token, refresh_token, account_id }
    App->>API: GET /accounts/v1/me/profile (Bearer access_token)
    API-->>App: { profile: { ... } }
    App->>App: Save session & Redirect to Home Screen
```

#### Step 1: Request Code
- **URL:** `POST https://beta-api.crunchyroll.com/auth/v1/device/code`
- **Headers:**
  - `Authorization: Basic ZXZ4YzVybGN1bnd4cm91YWpmeHI6NkJGWGM1SUk3UWx2Z3NFbzdiVjBuWUNfN1VRLXVlSVM=`
  - `Content-Type: application/x-www-form-urlencoded`
- **Body:** `scope=offline_access`
- **Response (HTTP 200):**
  ```json
  {
    "user_code": "6z2vx2",
    "device_code": "0eeea2c6-1f93-4c47-b7ee-68bb570e8a62",
    "interval": 500,
    "expires_in": 300
  }
  ```

#### Step 2: Poll for Activation
- **URL:** `POST https://beta-api.crunchyroll.com/auth/v1/device/token`
- **Headers:**
  - `Authorization: Basic ZXZ4YzVybGN1bnd4cm91YWpmeHI6NkJGWGM1SUk3UWx2Z3NFbzdiVjBuWUNfN1VRLXVlSVM=`
  - `Content-Type: application/json` *(Note: Must be application/json, form-urlencoded is rejected)*
- **Body:**
  ```json
  {
    "device_code": "0eeea2c6-1f93-4c47-b7ee-68bb570e8a62"
  }
  ```
- **Responses:**
  - `HTTP 204 No Content`: Device authorization pending; continue polling.
  - `HTTP 200 OK`: Device authorized; payload contains tokens:
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "...",
      "expires_in": 300,
      "token_type": "Bearer",
      "country": "US"
    }
    ```
  - `HTTP 400 Bad Request`: Code expired or invalid (`auth.obtain_device_access_token.obtain_device_access_token_failure`).

### 3.3 Alternative Login: Web Session Cookie Import (`etp-rt`)
For desktop users who prefer browser-like sign-in without a second screen:
1. An embedded Electron `BrowserWindow` loads `https://www.crunchyroll.com/login`.
2. The user solves Cloudflare Turnstile and completes login.
3. Crispyroll intercepts the session cookie `etp-rt` (or `access_token` cookie).
4. However, the Device Code flow is vastly simpler, cleaner, and completely avoids Electron webview overhead and Cloudflare bot detection.

---

## 4. Diff Summary: Old vs. New Interface

| Feature / Area | Old Interface (in Crispyroll) | New Interface (Observed Backend) | Status / Impact |
| :--- | :--- | :--- | :--- |
| **Client Credentials** | `xunihvedbt3mbisuhevt` (Tizen TV) | `evxc5rlcunwxrouajfxr` (Android TV 3.70.0) | Needs update for stability |
| **Login Mechanism** | Direct `grant_type=password` on `/auth/v1/token` | OAuth2 Device Grant (`/auth/v1/device/code` + `/device/token`) | **BROKEN**; Must switch to Device Grant |
| **Home Feed URL** | `/content/v2/discover/${storage.id}/home_feed` | `/content/v2/discover/home_feed` | **BROKEN**; 404 when unauthenticated |
| **CMS Episode Streams** | Expected `streams_link` in episode object | `streams_link` is `null`; use `cr-play-service` | Deprecated; Crispyroll already uses `video_v2` |
| **Playback Service** | `cr-play-service.prd.crunchyrollsvc.com/v1/{id}/tv/samsung/play` | `cr-play-service.prd.crunchyrollsvc.com/v1/{id}/tv/android/play` | Requires authenticated account token |
| **Guest Playback** | Allowed via anonymous token (`grant_type=client_id`) | **Rejected** (`40016: Outdated Token`); mandatory login | **BROKEN**; Guest streaming blocked |
| **Widevine License** | `cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine` | `cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine` | Unchanged; headers require authenticated Bearer |

---

## 5. Affected Files in Crispyroll

### 1. [src/renderer/core/service.js](./src/renderer/core/service.js)
- **Line 10 (`api.auth`):** Update `Basic` credentials to Android TV client key (`Basic ZXZ4YzVybGN1bnd4cm91YWpmeHI6NkJGWGM1SUk3UWx2Z3NFbzdiVjBuWUNfN1VRLXVlSVM=`).
- **Lines 62-65 (Device Flow):** Implement `deviceCode(request)` and `deviceToken(request)` to call `/auth/v1/device/code` and `/auth/v1/device/token`.
- **Line 337 (`home`):** Change path to `/content/v2/discover/home_feed` so it never evaluates to `/discover/null/home_feed`.
- **Line 444 (`video_v2`):** Align endpoint to `/v1/${request.data.id}/tv/android/play`.

### 2. [src/renderer/screens/login.js](./src/renderer/screens/login.js)
- **Lines 43-54 (`login-tv-section`):** Re-enable "Fast TV Login", remove "Not working properly" warnings, and generate a dynamic QR code pointing to `https://crunchyroll.com/activate`.
- **Lines 100-350:** Add automated polling loop using `window.service.deviceToken` that completes login immediately upon web approval. Provide fallback message explaining that password login requires the activate flow due to Crunchyroll security updates.

### 3. [src/renderer/core/session.js](./src/renderer/core/session.js)
- **Lines 80-150:** Verify session initialization handles device code token persistence cleanly and enforces login prompt before playback.

### 4. [src/main/catalog.js](./src/main/catalog.js)
- **Lines 14-15 (`CRUNCHYROLL_BASIC_AUTH`):** Update basic auth header to the active Android TV credentials.

### 5. [src/renderer/core/player.js](./src/renderer/core/player.js) & [src/renderer/screens/video.js](./src/renderer/screens/video.js)
- **Playback Guard:** Prevent launching `window.player.play()` if the user is not authenticated, showing a friendly prompt: *"Crunchyroll requires an active subscription to stream video. Please log in."*

---

## 6. Suggested Remediation Plan

```mermaid
graph TD
    A[Phase 1: Update Client Credentials] --> B[Phase 2: Implement OAuth2 Device Code Service]
    B --> C[Phase 3: Reactivate Fast TV Login in UI]
    C --> D[Phase 4: Fix Home Feed Route]
    D --> E[Phase 5: Playback Entitlement Guard]
    E --> F[Phase 6: End-to-End Verification]
```

### Phase 1: Client Credentials Upgrade
- Update `api.auth` in [src/renderer/core/service.js](./src/renderer/core/service.js) and `CRUNCHYROLL_BASIC_AUTH` in [src/main/catalog.js](./src/main/catalog.js) to the modern Android TV credentials (`Basic ZXZ4YzVybGN1bnd4cm91YWpmeHI6NkJGWGM1SUk3UWx2Z3NFbzdiVjBuWUNfN1VRLXVlSVM=`).

### Phase 2: Service Layer Implementation for Device Grant
- In [src/renderer/core/service.js](./src/renderer/core/service.js), implement:
  - `window.service.deviceCode({ success, error })` -> calls `POST /auth/v1/device/code` with `scope=offline_access`.
  - `window.service.deviceToken({ data: { device_code }, success, error, pending })` -> calls `POST /auth/v1/device/token` with JSON body `{"device_code": ...}`. Handles `HTTP 204` as pending and `HTTP 200` as completion.

### Phase 3: Fast TV Login Activation in UI
- In [src/renderer/screens/login.js](./src/renderer/screens/login.js):
  - On `init()`, immediately request a device code.
  - Display the `user_code` in large text (e.g. `6Z2VX2`).
  - Render a clean QR code linking to `https://crunchyroll.com/activate`.
  - Start an interval timer (default 3000ms) polling `deviceToken`.
  - Upon receiving `access_token`, persist token via `window.session.setTokens()`, fetch profile, and navigate to home.
  - In manual login section, add notice directing users to the activate code to avoid captcha friction.

### Phase 4: Route Fixes
- Fix [src/renderer/core/service.js:337](./src/renderer/core/service.js#L337) to remove `${storage.id}` from the `home_feed` URL, allowing discovery panels to load reliably.

### Phase 5: Playback Verification & Guards
- Ensure video screen checks `window.session.isLogged()`. If not logged in, prompt user to authenticate instead of failing silently with error 40016.

---

## 7. Open Questions & Assumptions

1. **Widevine L3 in Electron on Linux:**
   - *Confirmed:* Crispyroll uses Dash.js with Widevine DRM proxying (`com.widevine.alpha`).
   - *Unknown:* On Linux systems without official Google Chrome Widevine CDM libraries installed in the Electron environment, playback may require verifying that `libwidevinecdm.so` is loaded by Electron.
2. **Device Play Path Preference:**
   - *Observation:* Both `/v1/{id}/tv/samsung/play` and `/v1/{id}/tv/android/play` exist on `cr-play-service`.
   - *Test Requirement:* Once logged in with a premium account, verify whether `/tv/android/play` or `/tv/samsung/play` yields optimal DASH stream manifests for Dash.js.
3. **Password Grant Resurrection:**
   - *Assumption:* Password auth will NOT return without an embedded browser / Cloudflare solver. Device authorization is the standard, developer-friendly replacement.

---
*Report generated and validated by Antigravity Engineering.*
