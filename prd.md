# Full Stack Learning Platform - Evaluation Engine MVP

## Project Overview
A platform where developers can practice full stack development by building real components and features. The platform provides challenges ranging from React components to full stack applications with automated evaluation.

**Current Focus:** Building the Evaluation Engine MVP

---

## Target Audience
- Beginners learning full stack development

---

## MVP Scope

### What We're Building NOW
- **Evaluation Engine Only**
- A service that takes a public GitHub repo and runs automated tests against it
- **Submission Method:** Public GitHub repository URL or ZIP file upload
- **Focus Area:** React challenges only
- **Testing:** Automated testing with thorough test coverage
- **Admin:** Manual seeding of challenges (no admin panel yet)

### What's Coming LATER
- In-browser code editor
- Learning roadmap with progression system
- Question recommendations based on completion
- Full stack challenges (beyond just React)
- Admin panel for challenge management

---

## Technical Architecture

### Core Components
1. **Submission Handler**
   - API endpoint to receive GitHub repo URL
   - Validate URL format & repo accessibility
   - Queue the submission for processing

2. **Code Executor (Evaluation Worker)**
   - Clone the GitHub repo
   - Validate project structure (has package.json, required files, etc.)
   - Install dependencies
   - Run test suite in isolated environment
   - Capture results & logs

3. **Results Processor**
   - Parse test output
   - Store results in database
   - Return feedback to user (which tests passed/failed, error messages)

---

## Database Schema

### Challenges Table
**challenges:**
- id (primary key)
- title (e.g., "Build an Accordion")
- description (challenge instructions)
- starter_repo_url (your template repo URL)
- test_file_path (where your tests live)
- required_files (JSON array of files that must exist)
- created_at
- updated_at

### Submissions Table
**submissions:**
- id (primary key)
- challenge_id (foreign key)
- user_id (can be just email/name for now)
- repo_url (user's submitted GitHub repo)
- status (pending/running/completed/failed)
- created_at
- updated_at

### Results Table
**results:**
- id (primary key)
- submission_id (foreign key)
- total_tests (integer)
- passed_tests (integer)
- failed_tests (integer)
- test_details (JSON: [{name, status, error}])
- execution_time (in seconds)
- logs (text - console output)
- created_at

---

## API Endpoints

### Submit Solution
**POST /api/submit**

Request Body:
```json
{
  "challenge_id": "uuid",
  "repo_url": "https://github.com/user/repo",
  "user_email": "user@example.com"
}
```

Response:
```json
{
  "submission_id": "uuid",
  "status": "queued",
  "message": "Submission queued for evaluation"
}
```

### Get Results
**GET /api/results/:submission_id**

Response:
```json
{
  "submission_id": "uuid",
  "status": "completed",
  "total_tests": 10,
  "passed": 8,
  "failed": 2,
  "execution_time": 45.2,
  "details": [
    { "test": "renders without crashing", "status": "passed", "error": null },
    { "test": "opens accordion on click", "status": "passed", "error": null },
    { "test": "closes when clicked again", "status": "failed", "error": "Expected panel to close but it remained open" }
  ],
  "logs": "npm install output... test execution logs..."
}
```

---

## Evaluation Workflow
1. User submits GitHub repo URL
2. API validates URL & creates submission record (status: "pending")
3. Job added to queue (BullMQ)
4. Worker picks up job (status: "running"):
   - a. Clone user's repo to temp directory
   - b. Validate required files exist
   - c. Copy YOUR test files into their repo
   - d. Run `npm install`
   - e. Run `npm test` (executes your tests)
   - f. Parse test output (Jest JSON reporter)
5. Store results in database (status: "completed" or "failed")
6. Clean up temp directory
7. User retrieves results via GET /api/results/:id

---

## Tech Stack

### Backend
- **Framework:** Node.js + Express
- **Database:** PostgreSQL (or SQLite for initial MVP)
- **Job Queue:** BullMQ (for async test execution)
- **Cache/Queue Store:** Redis (required for BullMQ)

### Evaluation Worker
- **Runtime:** Node.js worker process
- **Git Operations:** `simple-git` npm package
- **Isolation:** Docker (optional for MVP, recommended for production)
- **Test Framework:** Jest with `--json` output flag

### Testing
- **Framework:** Jest
- **React Testing:** React Testing Library
- **Output Format:** Jest JSON reporter for structured results

---

## Challenge Structure

### Example Challenge Definition
```json
{
  "id": "react-accordion",
  "title": "Build an Accordion Component",
  "description": "Create a reusable accordion component...",
  "type": "frontend",
  "difficulty": "beginner",
  "requiredFiles": ["src/Accordion.jsx", "package.json"],
  "testSuite": "tests/accordion.test.js",
  "setupInstructions": "npm install && npm test"
}
```

### Starter File Structure
Your challenge template repository:
```
react-accordion-starter/
├── package.json
├── src/
│   └── Accordion.jsx // Empty or skeleton code for user
├── tests/
│   └── accordion.test.js // YOUR comprehensive tests
├── README.md
└── .gitignore
```

**User workflow:**
1. User sees challenge on platform
2. Clones/forks starter repo
3. Implements the solution
4. Submits their repo URL
5. Gets automated test results

---

## Test Injection Strategy

### Option A: Copy Tests Into User Repo (RECOMMENDED)
- User's repo has empty `tests/` folder (or placeholder)
- Evaluation engine copies your test files into their repo
- Runs tests from their repo context

**Pros:** Cleaner separation, easier to manage test versions

**Cons:** User could theoretically modify tests locally (but we control what runs)

### Option B: Copy User Code Into Test Repo
- Clone user's `src/` code
- Add it to YOUR test repository
- Run tests in your controlled environment

**Pros:** User can't see/modify tests

**Cons:** More complex setup, path management issues

**Decision:** Use Option A for MVP simplicity

---

## Security Considerations

### For MVP (Simple Approach)
- Run tests on server with timeouts (30–120 seconds max)
- Resource limits via Node.js (max memory, CPU time)
- Cleanup temp directories after each run
- Validate repo URL format before cloning

**Risk Level:** Low (for ~20 tests/day, trusted users)

### For Production (Recommended Later)
- Run each submission in isolated Docker container
- Network isolation (no outbound requests during tests)
- Strict resource limits (CPU, memory, disk)
- Sandboxed filesystem

**When to implement:** When scaling to 100+ tests/day or public users

---

## Feedback Granularity
Users will see:
- ✅ **Pass/Fail Status:** "8/10 tests passed"
- ✅ **Test Names:** "Accordion opens on click"
- ✅ **Error Messages:** Full error messages and stack traces for failed tests
- ✅ **Execution Time:** How long tests took to run
- ✅ **Console Logs:** Captured output from test execution

Example output:

Results for: Build an Accordion Component

Status: 8/10 tests passed

✅ Component renders without crashing
✅ Accordion displays all items
✅ Panel opens when header is clicked
✅ Panel shows correct content when open
✅ Panel closes when clicked again
✅ Only one panel open at a time
✅ Handles empty items array gracefully
✅ Applies custom className prop

❌ Panel has correct ARIA attributes
Error: Expected aria-expanded="true" but got "false"

❌ Keyboard navigation works (Enter key)
Error: KeyDown event did not trigger panel open

Execution Time: 2.3s

---

## Initial Challenge Set
Start with 3–5 React challenges to validate the engine:
1. **Accordion Component (Easy)**
   - Toggle panels open/closed
   - Single or multiple panels open
   - Basic accessibility

2. **Modal/Dialog Component (Easy–Medium)**
   - Open/close functionality
   - Click outside to close
   - Escape key support
   - Focus management

3. **Tabs/Chips Component (Medium)**
   - Switch between tabs
   - Active state management
   - Controlled/uncontrolled modes

4. **Todo List (Medium)** *(optional)*
   - Add/remove todos
   - Mark as complete
   - Filter by status

5. **Dropdown/Select (Medium)** *(optional)*
   - Select options
   - Keyboard navigation
   - Search/filter

---

## MVP Feature Checklist

### ✅ Must Have (Phase 1)
- [ ] Submit endpoint with repo URL validation
- [ ] Clone GitHub repository
- [ ] Validate project structure (required files)
- [ ] Run test suite and capture results
- [ ] Parse Jest JSON output
- [ ] Store results in database
- [ ] Results API endpoint
- [ ] Basic error handling:
  - [ ] Invalid repo URL
  - [ ] Repo not accessible (private/404)
  - [ ] Missing required files
  - [ ] Test execution timeout
  - [ ] npm install failures
- [ ] Seed 3 initial challenges manually
- [ ] Worker cleanup (delete temp directories)

### ❌ Not Now (Future Phases)
- Admin panel for challenge management
- User authentication/authorization
- In-browser code editor
- Real-time test execution updates (WebSocket)
- Challenge recommendations based on completion
- Learning roadmap visualization
- User progress tracking
- Leaderboards/points system
- Code quality metrics (ESLint, coverage)
- Full stack challenges (backend + database)

---

## Deployment & Costs

### Usage Estimates (MVP)
- Tests per day: 20
- Test duration: 2 minutes each
- Total compute: 40 minutes/day = ~20 hours/month

### Recommended Platforms & Costs

#### Option 1: Fly.io (FREE)
- Compute: Free tier (3 shared VMs)
- Database: Supabase free tier
- Cost: $0/month
- Best for: MVP testing

#### Option 2: Railway ($5/month)
- Compute: 500 execution hours included
- Database: Included
- Cost: $5/month
- Best for: Simple deployment

#### Option 3: AWS (Free Tier Year 1)
- Compute: t4g.micro EC2
- Database: RDS db.t3.micro
- Cost: $0/month (year 1), then ~$15/month
- Best for: Long-term scalability

### Scaling Costs
Even at 1,000 tests/day (50× growth):
- ~33 hours compute/month
- Still within free tiers
- Estimated cost: $0–10/month

**Recommendation:** Start with Fly.io (free) or Railway ($5) for MVP

---

## Development Phases

### Phase 1: Core Evaluation Engine (Current Focus)
Goal: Get automated testing working end-to-end

Tasks:
1. Set up project structure (Node.js + Express)
2. Database schema & migrations
3. POST /api/submit endpoint
4. Git cloning functionality
5. Test execution worker
6. Jest result parsing
7. GET /api/results endpoint
8. Error handling & logging
9. Manual seed 3 challenges
10. Test with real repos

Success Criteria:
- Can submit a repo URL
- Tests run automatically
- Get detailed pass/fail results
- Handles common errors gracefully

### Phase 2: Enhanced Testing & UI
- Build simple frontend to view challenges
- Submit form for repo URL
- Results display page
- Add 5 more challenges
- Improve error messages

### Phase 3: User Experience
- User accounts & authentication
- Track submission history
- Progress dashboard
- Challenge difficulty levels

### Phase 4: Advanced Features
- In-browser code editor
- Learning roadmap
- Full stack challenges
- Admin panel

---

## Key Technical Decisions

1. **Test Injection Method**
   - Decision: Copy tests into user's repo before running
   - Reason: Simpler path management, easier debugging

2. **Security Approach**
   - Decision: Start without Docker, add timeouts and resource limits
   - Reason: Sufficient for MVP scale, can add Docker later

3. **Test Framework**
   - Decision: Jest + React Testing Library
   - Reason: Industry standard, excellent React support, JSON output

4. **Queue System**
   - Decision: BullMQ with Redis
   - Reason: Reliable, scalable, good for async job processing

5. **Database Decision**
   - Decision: PostgreSQL (or SQLite for quick MVP)
   - Reason: Structured data, relationships, JSON column support

6. **Starter Files Decision**
   - Decision: Provide starter repos, users fork/clone
   - Reason: Clear starting point, consistent structure

---

## Success Metrics (MVP)
- ✅ Evaluation engine processes 100% of valid submissions
- ✅ Average test execution time < 3 minutes
- ✅ <5% false positives/negatives in test results
- ✅ Comprehensive error messages for common issues
- ✅ Zero security incidents during testing phase

---

## Next Steps
1. Set up project repository
   - Initialize Node.js project
   - Set up Express server
   - Configure PostgreSQL/SQLite
2. Build submit endpoint
   - Validate GitHub URLs
   - Create submission records
3. Implement Git cloning
   - Test with simple-git package
   - Handle errors (private repos, 404s)
4. Create evaluation worker
   - File validation
   - Test injection
   - Jest execution
   - Result parsing
5. Build results endpoint
   - Query database
   - Format test details
6. Create first challenge
   - Write Accordion component tests
   - Create starter template
   - Seed database
7. End-to-end testing
   - Test entire workflow
   - Fix edge cases
   - Add logging

---

## Questions to Address During Development
- How to handle npm install failures?
- What if user has different Node.js version requirements?
- Should we support yarn/pnpm or just npm?
- How verbose should error logs be?
- Should we show package.json validation errors?
- Rate limiting strategy for submissions?
- How to handle test timeouts gracefully?

---

## Resources & References

### Libraries to Use
- simple-git: GitHub operations
- bull / bullmq: Job queue
- jest: Test runner
- @testing-library/react: React testing
- express: Web framework
- pg / better-sqlite3: Database

### Documentation
- Jest JSON Reporters: https://jestjs.io/docs/cli#--json
- BullMQ Guide: https://docs.bullmq.io/
- React Testing Library: https://testing-library.com/react

---

## Project Timeline Estimate
- Week 1–2: Core evaluation engine
- Week 3: First 3 challenges + testing
- Week 4: Polish, error handling, deployment

**MVP Ready:** ~1 month

---

*Last Updated: February 9, 2026*
