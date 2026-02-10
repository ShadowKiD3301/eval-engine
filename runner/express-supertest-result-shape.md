# express-supertest Runner – Result Shape

The `express-supertest` runner is responsible for:
- Importing the user's Express app from the configured entry point (e.g. `src/app.js`).
- Executing the hidden Jest + Supertest test suite for the challenge.
- Returning a normalized JSON result for the evaluation engine.

## Status Semantics

The runner must classify outcomes as:

- `"passed"` — All tests ran and passed.
- `"failed"` — Tests ran, at least one assertion failed.
- `"error"` — Tests could not run at all (syntax error, missing file, import error, Jest crash, etc.).

## Example Result JSON

```json
{
  "jobId": "<uuid>",
  "challengeId": "jwt-middleware",
  "status": "passed",
  "exitCode": 0,
  "durationMs": 2310,
  "tests": [
    {
      "name": "login returns a JWT token for valid credentials",
      "status": "passed",
      "message": null
    },
    {
      "name": "profile returns 401 when Authorization header is missing",
      "status": "failed",
      "message": "Expected status 401 but received 200"
    }
  ],
  "logs": "<truncated stdout/stderr from Jest>">
}
```

## Jest Integration Notes

- Runner must invoke Jest with `--json --runInBand` and capture the JSON output.
- From Jest JSON, map each test case to:
  - `name`: full test name (suite + test)
  - `status`: `"passed" | "failed"`
  - `message`: first failure message (if any)
- If Jest itself fails to start (e.g., `require('../../src/app')` throws), classify as `status: "error"` and:
  - `tests`: `[]`
  - `logs`: include the stack trace / error snippet (truncated)

## Engine-Level Normalization

The higher-level evaluation engine wraps this structure with its own envelope if needed, but these fields must always be present:

- `jobId`
- `challengeId`
- `status`
- `exitCode`
- `durationMs`
- `tests` (array, possibly empty)
- `logs` (string, truncated by engine)
"}}]}]}']