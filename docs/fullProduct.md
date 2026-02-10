PRD: WebDev Challenge Platform (MVP)
Version: 1.0
Date: February 9, 2026
Status: Draft
1. Executive Summary
Product Goal: To build a "LeetCode for Web Development" that bridges the gap between algorithmic puzzles and full-stack project tutorials. Users will solve isolated, practical web development challenges (starting with Node.js) in 30-40 minute sessions.
MVP Scope:
 * Challenge Interface: A browser-based IDE (Monaco) with file tree support.
 * Client-Side Execution: WebContainers for instant feedback (no server load).
 * Server-Side Evaluation: A secure, containerized Docker engine to grade Node.js submissions securely and offline.
2. User Personas & Stories
Target User: " The Upskiller"
 * Profile: Junior developer or student creating a portfolio. Knows basics but needs practical drill practice.
 * User Stories:
   * "As a user, I want to select a Node.js challenge (e.g., 'Build a JWT Middleware') from a list."
   * "As a user, I want to write code in a VS-Code-like environment inside my browser."
   * "As a user, I want to run npm test locally to check my work before submitting."
   * "As a user, I want to submit my code and receive a Pass/Fail grade based on hidden tests."
3. Functional Requirements
3.1. Frontend ( The "IDE")
| ID | Feature | Description | Priority |
|---|---|---|---|
| FE-01 | Code Editor | Implementation of Monaco Editor with syntax highlighting for JS/JSON. | P0 |
| FE-02 | File Tree | Display the folder structure (server.js, package.json, etc.). Users can click to open files. | P0 |
| FE-03 | WebContainer Integration | Boot a Node.js environment in the browser. Must support npm install (cached) and npm run test. | P0 |
| FE-04 | Terminal Pane | integrated terminal to show output from WebContainer commands. | P1 |
| FE-05 | Challenge Description | Markdown rendering of the problem statement and requirements. | P0 |
3.2. Backend (The "Orchestrator")
| ID | Feature | Description | Priority |
|---|---|---|---|
| BE-01 | Submission API | Endpoint (POST /submit) that accepts a Zipped folder + Challenge ID. | P0 |
| BE-02 | Job Queue | Integration of BullMQ + Redis to handle concurrent submissions without crashing. | P0 |
| BE-03 | Pre-flight Check | Logic to parse package.json and reject submissions containing unauthorized dependencies. | P0 |
| BE-04 | Polling/WebSocket | Mechanism to inform the frontend when the evaluation is complete. | P1 |
3.3. Evaluation Engine (The "Sandbox")
| ID | Feature | Description | Priority |
|---|---|---|---|
| EE-01 | Docker Runner | A generic Node.js Docker image (node:18-alpine) configured for security. | P0 |
| EE-02 | Network Isolation | Container must run with NetworkDisabled: true. | CRITICAL |
| EE-03 | Dependency Mounting | Logic to mount the host's node_modules into the container as Read-Only. | P0 |
| EE-04 | Test Execution | Logic to run the hidden test suite against user code and capture exit codes/logs. | P0 |
| EE-05 | Timeout Enforcer | Hard kill switch if container runs > 10 seconds. | P0 |
4. Technical Architecture
4.1. Stack
 * Frontend: Next.js (React), Tailwind CSS, Monaco Editor, WebContainers API.
 * Backend API: Node.js (Express/Fastify).
 * Queue: Redis (BullMQ).
 * Evaluation: Docker Engine.
 * Database: PostgreSQL (Supabase/Neon).
4.2. Security Architecture (The "No-Internet" Policy)
 * Ingress: User uploads code.
 * Sanitization: Backend checks package.json for banned packages.
 * Isolation: Docker container starts with No Network Interface.
 * Dependencies: node_modules are injected from the trusted server path.
 * Tests: Hidden tests are injected from the trusted server path.
5. Data Models (Simplified)
Users
 * id (UUID)
 * email
 * username
Challenges
 * id (UUID)
 * title (e.g., "Build an Express Proxy")
 * difficulty (Easy/Medium/Hard)
 * template_repo_url (URL to the starter code)
 * test_repo_path (Local path on server where hidden tests/node_modules reside)
Submissions
 * id (UUID)
 * user_id
 * challenge_id
 * status (Processing, Passed, Failed, Error)
 * logs (Text output from the test runner)
 * created_at
6. Non-Goals (Out of Scope for MVP)
 * React Backend Evaluation: For MVP, React challenges will rely on client-side WebContainer checks only. Server-side rendering checks (Puppeteer) are Phase 2.
 * Plagiarism Detection: We will not check if users copied code for now.
 * Social Features: No leaderboards, forums, or profiles.
 * Multi-file Creation: Users will work primarily within provided files, not creating complex new directory structures.
7. MVP Roadmap
Phase 1: The Engine (Weeks 1-2)
 * Setup Docker on dev machine.
 * Create the "Base Node Image".
 * Write the evaluator.js script to mount volumes and run tests.
 * Verify "No Internet" and "Read-Only" constraints.
Phase 2: The API & Queue (Week 3)
 * Setup Express API.
 * Setup Redis and BullMQ.
 * Connect API POST /submit to the Evaluation Engine.
Phase 3: The Frontend (Weeks 4-5)
 * Setup Next.js with Monaco Editor.
 * Implement WebContainers for local "Playground" feel.
 * Connect Frontend "Submit" button to Backend API.
8. Success Metrics
 * Execution Time: Evaluation returns result in < 5 seconds.
 * Security: 0 successful attempts to fetch external packages or ping https://www.google.com/search?q=google.com from inside the container.
 * Reliability: 99% of valid code submissions result in a "Pass".
