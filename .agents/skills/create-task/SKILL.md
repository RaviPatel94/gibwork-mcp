---
name: create-task
description: Walks a user through creating a Gibwork task/bounty end-to-end — collecting the brief, inferring a title, category, and tags when needed and in case of payment quote expiration retry the whole process again. Use this skill whenever a user says they want to create/post a task, bounty, or paid request on Gibwork, or mentions gibwork_task_create_prepare / gibwork_task_create_submit.
---

# Gibwork Task Creation

Uses the `gibwork_task_create_prepare` / `gibwork_task_create_submit` and in case of payment quote expiration retry the whole process again without asking for approval.

## Step 1: Ask the intake questions

Ask for these fields. Required ones must be filled before moving on; optional ones can be skipped/defaulted.

| Field | Required? | Notes |
|---|---|---|
| Title | Optional | Max 120 characters. If omitted, recommend a concise, descriptive title based on the description and task requirements, and use it unless the user changes it. |
| Description | Required | What the task is about |
| Note | Optional | Extra context/tips for freelancers |
| Requirements | Required | What a freelancer needs (skills, tools, eligibility) |
| What to submit | Required | Exact deliverable expected |
| Payment amount | Required | Numeric; confirm the token too (see Step 2) |
| Minimum payment amount | Optional | Default `1.00` if not given |
| Deadline | Optional | — |
| Verified-only submissions | Optional | Default **No**. Only meaningful for Plus/premium accounts |
| Min follower count / verification gating | Optional | e.g. "X verified only" or "min 500 followers" |

## Step 2: Show the prepared-task summary and request the required approval

Present the full task data plus the exact payment quote as a markdown table, then request one explicit approval of that quote. This approval is required to fund and publish the bounty; do not request another approval unless the task or quote changes, or the confirmation expires.

**Tips for filling the summary**

- **Title**: trim to 120 chars. If omitted, infer a concise, descriptive title from the task description and requirements; do not ask for one unless no unambiguous title can be formed.
- **Category**: infer from the brief. If the tool schema exposes a fixed list of skill slugs, match against it rather than inventing a value; if you can't confidently map it, leave it out and ask the user to pick from the schema's options.
- **Tags**: infer up to 3 unique discovery tags from the brief (e.g. "design", "solana", "video").
- **Payment token**: never guess the mint address from a ticker symbol or copy one from another environment/config. Confirm the intended token with the user (Gibwork bounties are typically paid in USDC) and resolve the mint from trusted current configuration/documentation, then let `gibwork_task_create_prepare` validate it.
- **Amounts**: format payment and minimum submission to **exactly two decimals** (e.g. `25.00`).
- **Follower/verification gating**: read the tool's exposed schema for the correct field name before sending it; don't invent a field for this.

Example:

```markdown
### Review your task before publishing

| Field | Value |
|---|---|
| Title | ... |
| Category | ... |
| Tags | ..., ..., ... |
| Description | ... |
| Note | ... (omit row if none) |
| Requirements | ... |
| What to submit | ... |
| Payment | 25.00 USDC |
| Minimum submission | 1.00 USDC |
| Deadline | ... (omit row if none) |
| Verified-only submissions | No |
| Follower/verification gate | ... (omit row if none) |

**Payment quote**
| | |
|---|---|
| Funding amount | ... |
| Platform fee | ... |
| Total debit | ... |

Reply **approve** to fund and publish this task, or tell me what to change.

only after the approval is recived then `gibwork_task_create_prepare` / `gibwork_task_create_submit` can be called if needed, before the approval these tools shoudnt be called.
```

## Step 3: Map answers to the tool schema

| Tool field | Value |
|---|---|
| `title` | Title from Step 2 |
| `content` | Safe-HTML body combining Description, Note (if any), Requirements, and What to submit. Max 10,000 characters |
| `tags` | Up to 3 tags from Step 2 |
| `primarySkillSlug` | Optional. Category from Step 2 |
| `payment.amount` | Two decimals, e.g. `25.00` |
| `payment.mintAddress` | Token mint confirmed in Step 2 |
| `minSubmissionAmount` | Given value or `"1.00"`, two decimals |
| `deadline` | Pass through if given |
| `allowOnlyVerifiedSubmissions` | `true`/`false` per the user's answer (default `false`) |

`content` format (skip the Note section if not given):

```html
<p><strong>Description</strong><br>...</p>
<p><strong>Note</strong><br>...</p>
<p><strong>Requirements</strong><br>...</p>
<p><strong>What to submit</strong><br>...</p>
```

Never invent legacy fields like `paymentAmount`, `paymentMint`, or `wait`.

Call `gibwork_task_create_prepare` with the assembled payload. This returns `confirmationId`, `intentId`, `taskId`, `expiresAt`, `lastValidBlockHeight`, and `paymentQuote` (token, `fundingAmount`, `platformFee`, `totalDebit`).

## Step 4: Submit promptly after approval

- If the user asks for changes before submission, update the relevant field(s), prepare a fresh transaction, show its exact quote, and obtain approval for the new quote.
- After the user explicitly approves the prepared quote, call `gibwork_task_create_submit` once with just `{ "confirmationId": "..." }`. Do not retry an ambiguous submission.
- If preparation definitively expires before submission, re-run `gibwork_task_create_prepare` at most three times for the unchanged task. Each refreshed quote requires its own explicit approval before submission. If all three attempts expire or preparation/submission has an ambiguous outcome, stop and report the returned IDs and status; never retry an ambiguous submission.
- Confirm publication to the user with the resulting `taskId`.