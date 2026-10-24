# Gibwork Bounty MCP Project

This project supports the lifecycle of a Gibwork bounty: defining a paid request, collecting submissions, reviewing the work, providing feedback on incomplete entries, and distributing the reward to accepted contributors. It is valuable because it makes the process clearer and more repeatable for both bounty creators and contributors, while keeping review and payout decisions tied to the original requirements.

The project uses the **Gibwork MCP toolset**. MCP lets an AI client work with Gibwork through structured tools for discovering bounties, creating tasks, reviewing submissions, commenting on incomplete work, and preparing or finalizing payouts.

## Prerequisites

- Node.js 18 or later
- npm
- A Gibwork account and connected wallet
- An AI client with the Gibwork MCP server enabled and authenticated

## Installation

Clone the repository and install its dependencies:

```bash
git clone <repository-url>
cd GibworkMcp
npm install
Or directly copy the MCP skills in a Gibwork mcp enviorment
https://www.npmjs.com/package/@gibwork/mcp
```

## Usage

This repository provides dependencies used by the bounty workflow; operations are performed through the connected Gibwork MCP tools rather than an npm command. In your MCP-enabled client, use the appropriate tool for the stage of the bounty:

1. Create or locate a bounty.
2. Review the submitted work against the bounty requirements.
3. Comment on incomplete or incorrect submissions when feedback is needed.
4. Prepare the payout, review the proposed recipients and amounts, and explicitly confirm before finalizing payment.
5. Frequntly asked questions

Typical MCP request (conceptual input):

```json
{
  "bountyId": "bounty_123",
  "submissionId": "submission_456",
  "decision": "accepted",
  "amount": 25,
  "reason": "The submission meets the stated deliverables."
}
```

Typical outcome (conceptual output):

```json
{
  "status": "prepared",
  "recipient": "submission_456",
  "amount": 25,
  "currency": "USDC",
  "nextStep": "Confirm the payout in the MCP client."
}
```

Payouts are intentionally a two-step process: prepare the transaction first, verify the quote and recipient details, then submit it only after explicit confirmation.

## Project dependencies

- `exceljs` for spreadsheet-based bounty materials or submissions
- `mammoth` for extracting content from Word documents
- `pdfjs-dist` for reading PDF-based requirements or deliverables

Install or update dependencies with:

```bash
npm install
```
