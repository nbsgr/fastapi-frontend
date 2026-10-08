# Universal Full-Stack Architecture & Reusable Standards (GEMINI.md)

> This document defines the **repeated baseline boilerplate** for both React Frontend and Java Spring Boot Backend.

---

## 1. Universal Project File Structures

### Frontend (React + Vite)
```
<frontend-project-root>/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx                       # Mounts App in BrowserRouter
│   ├── App.jsx                        # Master routing table (<Routes>, <Route>)
│   ├── index.css                      # Base reset & typography
│   ├── api/
│   │   └── api.js                     # [REPEATED] Generic fetch caller, cookie session management
│   ├── components/
│   │   └── ProtectedRoute.jsx         # [REPEATED] Route guard checking getSession("token")
│   ├── pages/                         # Each screen has paired JSX + CSS
│   │   ├── HomePage.jsx & .css        # Landing screen
│   │   ├── Login.jsx & .css           # [REPEATED] Login with direct DOM validation
│   │   ├── Signup.jsx & .css          # [REPEATED] Direct signup screen (or OTP when enabled)
│   │   ├── ForgotPassword.jsx & .css  # [REPEATED] Password reset request
│   │   ├── ResetPassword.jsx & .css   # [REPEATED] Password update screen
│   │   ├── Dashboard.jsx & .css       # [REPEATED] Universal dashboard shell
│   │   └── [DomainFeature].jsx & .css # Project-specific views
│   └── assets/                        # Icons and images
```

### Backend (Java Spring Boot)
```
<base-package>/
├── Application.java                   # Spring Boot entry point
├── config/                            # Infrastructure & security
│   ├── SecurityConfig.java            # [REPEATED] Stateless JWT security & route rules
│   ├── JwtAuthFilter.java             # [REPEATED] Bearer token filter
│   ├── CorsConfig.java                # [REPEATED] Allowed origins, methods, headers
│   ├── CustomAuthenticationEntryPoint.java  # [REPEATED] 401 handler
│   ├── CustomAccessDeniedHandler.java       # [REPEATED] 403 handler
│   └── WebSocketConfig.java           # STOMP broker (when realtime needed)
├── controller/                        # REST Controllers
│   ├── UsersController.java           # [REPEATED] Auth & profile endpoints (signup, signin, profile)
│   └── [Domain]Controller.java        # Project-specific endpoints
├── manager/                           # Business logic (ALWAYS *Manager, NEVER *Service)
│   ├── UsersManager.java              # [REPEATED] User registration, auth validation
│   ├── JWTManager.java                # [REPEATED] Token creation, parsing, validation
│   ├── EmailManager.java              # [REPEATED] Email delivery via JavaMailSender / JMS (No external APIs like Brevo)
│   └── [Domain]Manager.java           # Project-specific business logic
├── rep/                               # Repositories (ALWAYS 'rep', NEVER 'repository')
│   ├── UsersRepository.java           # [REPEATED] JpaRepository for Users
│   └── [Domain]Repository.java        # Project-specific JPA queries
├── model/                             # Entities (ALWAYS 'model', NEVER 'entity')
│   ├── Users.java                     # [REPEATED] User account model
│   └── [Domain].java                  # Project-specific entities
└── dto/
    └── ApiResponse.java               # [REPEATED] Unified response wrapper (status, message, data)
```

---

## 2. Repeated Spring Boot Core (Identical Boilerplate for Every Project)

### 1. Database Models (`model/`)
- **`Users.java`**:
  - `email` (PK / String), `fullname` (String), `password` (BCrypt hash), `role` (int: 1=USER, 2=ADMIN).

### 2. Repositories (`rep/`)
- **`UsersRepository.java`**:
  - Extends `JpaRepository<Users, String>`.
  - Methods: `boolean existsByEmail(String email);`, `Optional<Users> findByEmail(String email);`.

### 3. JWT & Security Infrastructure
- **`JWTManager.java`**:
  - Signed with HS256 secret (`jwt.secret` in `application.properties`).
  - `generateToken(String email, int role)` (24-hour expiration).
  - `validateTokenAndGetClaims(String token)`.
  - `getEmailFromToken(String token)`, `getRoleFromToken(String token)`.
- **`JwtAuthFilter.java`**:
  - Extends `OncePerRequestFilter`.
  - Extracts `Authorization: Bearer <token>`.
  - Validates via `JWTManager`, populates `UsernamePasswordAuthenticationToken` with authorities (`ROLE_USER`, `ROLE_ADMIN`) into `SecurityContextHolder`.
- **`SecurityConfig.java`**:
  - Stateless session (`SessionCreationPolicy.STATELESS`).
  - Disabled CSRF, Form Login, HTTP Basic.
  - CORS with defaults.
  - Public permit matchers: `/users/**`, `/error`, `/ws/**`.
  - Authenticated matchers: `.anyRequest().authenticated()`.
  - Filter order: `JwtAuthFilter` before `UsernamePasswordAuthenticationFilter`.

### 4. Email Delivery Standard
- **Java Mail Sender (JMS / Spring Mail)**:
  - Configured via `spring-boot-starter-mail` and `JavaMailSender` (SMTP).
  - **No external third-party HTTP APIs (like Brevo)** — always use native Spring Mail / JMS.

### 5. Standard Envelope (`ApiResponse<T>`)
```java
package <base>.dto;

public class ApiResponse<T> {
    private int status;
    private String message;
    private T data;

    public ApiResponse(int status, String message, T data) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
}
```

---

## 3. Repeated Frontend Core (Identical Boilerplate for Every Project)

### 1. Unified Network & Session (`src/api/api.js`)
- `callApi(method, url, data, handler, token)` handles JSON headers, body stringifying, and error catching.
- `setSession("token", token, days)` writes token to `document.cookie`.
- `getSession("token")` reads token from `document.cookie`.

### 2. Route Guard (`src/components/ProtectedRoute.jsx`)
- Reads `getSession("token")`.
- If missing, redirects to `/login`. If valid, renders `children`.

### 3. Auth Screens (`src/pages/`)
- **`Login.jsx`**: Validates fields, calls `/users/signin`, saves token, redirects to `/dashboard`.
- **`Signup.jsx`**: Direct signup (submits user credentials to `/users/signup`, redirects to `/login`).

### 4. Universal Dashboard Shell (`src/pages/Dashboard.jsx`)
The Dashboard layout repeated in every project:
- **Header**: Brand logo, App title, `fullname` display, Logout icon.
- **Collapsible Sidebar**: Open/closed toggle, `+ New [Item]` button, dynamic list of user items with rename and delete actions.
- **Main Content Area**: Active item workspace view.
- **Mount Lifecycle**: `checkToken()` validates JWT with `/users/getfullname`, populates user items, redirects to `/login` if token expired.
- **Logout Routine**: Clears cookie token (`setSession("token", "", -1)`), navigates to `/login`.

---

## 4. Universal Coding Style Rules

- **Language**: Plain JavaScript (`.js`, `.jsx`) only. Never TypeScript.
- **Functions**: Strict traditional function declarations: `function name() {}`. Never arrow functions (`=>`), never IIFEs, never function expressions assigned to variables (`var foo = function() {}`).
- **Patterns to Avoid**: Never use `.bind()`, never use the `class` keyword (functional components and plain objects only), never use JSDoc `@param` tags.
- **Backend Architecture**:
  - Services are always named `*Manager` in package `manager`.
  - Repositories are always in package `rep`.
  - Entities are always in package `model`.
  - Abbreviated dependency injection naming (`UM`, `UR`, `JWT`, `EM`).
  - Structured banner comments (`// =========================`).
  - All controller endpoints return `ResponseEntity<ApiResponse<T>>`.
