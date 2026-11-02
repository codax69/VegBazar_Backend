# Technical Requirements Document (TRD)
## VegBazar AI Assistant

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Stack** | MERN (MongoDB, Express, React, Node — ES Modules) |
| **Last updated** | Aug 3, 2026 |

## 1. Purpose
Defines the technical design for adding a Groq-hosted LLM-powered chat
assistant to `VegBazar_Backend`, following the project's existing MVC
conventions (routes → controllers → models, ES modules, standard JSON error
shape).

## 2. Architecture Overview

```
[React: VegBazarChat.jsx]
        |  POST /api/ai/chat   { messages: [...] }
        v
[Express route: ai.routes.js]  --(existing auth middleware)-->
        v
[ai.controller.js]  -- stateless, per-request only --
        |
        v
[Groq API: chat.completions.create]  <--- tools: search_products,
        |         ^                        view_cart, add_to_cart,
        | tool_calls?                       remove_from_cart, place_order
        v         |
[ai.tools.js: runTool()] -----------------
        |
        v
[MongoDB: Product / Cart / Order collections]
```

Key property: the **only** durable writes in this flow are to Cart/Order —
there is no "Conversation" or "Message" collection. Chat state lives in the
browser tab only (React state) for the duration of the session.

## 3. Components

### 3.1 Frontend
- `VegBazarChat.jsx` — launcher + panel UI, renders assistant replies and
  structured action cards (products, cart, order confirmation).
- `useAIChat.js` — owns the in-memory message array, posts to the backend,
  never touches localStorage/sessionStorage.

### 3.2 Backend
- `groq.client.js` — Groq SDK instance; reads `GROQ_API_KEY`/`GROQ_MODEL` from env.
- `ai.tools.js` — tool JSON schemas (given to the model) + executors (real DB calls).
- `ai.controller.js` — builds the system prompt, runs the tool-call loop, returns `{reply, actions}`.
- `ai.routes.js` — `POST /api/ai/chat`, behind existing auth middleware.

## 4. Sequence / Data Flow
1. User submits a message → appended to the client-side message array.
2. Client POSTs the last ≤20 `{role, content}` messages plus the auth bearer token.
3. Server prepends its own system prompt (client-sent `system` messages are stripped, so the prompt can't be overridden from the browser) and calls Groq with the tool schemas, `tool_choice: "auto"`.
4. If the model returns `tool_calls`, the server executes them locally against MongoDB (`runTool`), appends the results as `role: "tool"` messages, and calls Groq again. Capped at 5 rounds.
5. Once the model returns a plain text reply, the server responds with `{ success, reply, actions }`.
6. Client appends the assistant message and renders any `actions` as rich cards.
7. Nothing from steps 1–6 is written to a database except the Cart/Order side effects triggered inside `runTool`.

## 5. API Contract

**POST** `/api/ai/chat` (auth required)

Request:
```json
{ "messages": [ { "role": "user", "content": "quick dinner for a diabetic" } ] }
```

Response `200`:
```json
{
  "success": true,
  "reply": "Here's a light bhindi + moong dal combo...",
  "actions": [
    { "type": "products", "items": [ { "_id": "...", "name": "Bhindi", "price": 40, "unit": "kg", "stock": 12 } ] }
  ]
}
```

Response `400` (bad input) / `500` (server or upstream failure):
```json
{ "success": false, "message": "Human readable description", "error": "detail (non-prod only)" }
```

## 6. Tool Schemas (summary)
| Tool | Purpose | Key params |
|---|---|---|
| `search_products` | Ground recommendations in real catalog data | `query`, `category`, `maxPrice` |
| `view_cart` | Read current cart + total | — |
| `add_to_cart` | Add confirmed items | `items: [{productId, quantity}]` |
| `remove_from_cart` | Remove an item | `productId` |
| `place_order` | Finalize the order | `shippingAddress`, `paymentMethod` |

Full JSON Schemas are defined in `ai.tools.js`.

## 7. Data Model Dependencies
The tool executors assume (adjust field names to your real schemas):

| Model | Fields assumed |
|---|---|
| `Product` | `name, category, price, unit, stock, image, isAvailable` |
| `Cart` | `userId, items: [{ product (ref Product), quantity }]` |
| `Order` | `userId, items, totalAmount, shippingAddress, paymentMethod, paymentStatus, orderStatus` |

## 8. Security
- Route sits behind the project's existing JWT auth middleware; `req.user._id` scopes every cart/order action to the caller — no cross-user access is possible via the tools.
- The system prompt is server-owned; any `role: "system"` entries in the client payload are discarded before the request reaches Groq.
- `GROQ_API_KEY` is read from `process.env` only — never hardcoded, never logged.
- Input validation rejects empty/malformed `messages` payloads with `400`.

## 9. Performance & Cost Controls
- `MAX_HISTORY_MESSAGES = 20` — bounds tokens sent per request.
- `MAX_TOOL_ROUNDS = 5` — bounds worst-case latency/cost per request.
- Model defaults to `llama-3.3-70b-versatile` (Groq's low-latency, tool-capable production model as of writing); overridable via `GROQ_MODEL` without a code change.
- At public scale, add per-user rate limiting (e.g. `express-rate-limit`) — not included by default.

## 10. Error Handling
Follows the project's Rule 3 standard: async controller logic wrapped in
`try/catch`, errors returned as `{success:false, message, error?}` with
appropriate HTTP status. Tool-level failures (e.g. "cart is empty") are
returned as structured `{error: "..."}` objects fed back to the model, so the
assistant can explain the problem conversationally instead of the request
hard-failing.

## 11. Testing Strategy
- **Unit:** `ai.tools.js` executors against a mocked Mongoose layer (stock limits, cart math, order totals).
- **Integration:** `POST /api/ai/chat` with a mocked Groq response containing `tool_calls`, verifying the loop executes tools and returns the expected `actions` shape.
- **Manual QA:** recipe grounding accuracy (no invented items), full cart → order happy path for both COD and ONLINE, and the "cart empty" / "out of stock" error paths.

## 12. Deployment Notes
- New dependency: `groq-sdk`.
- New env vars: `GROQ_API_KEY`, `GROQ_MODEL` (optional).
- No schema migrations required, assuming `Cart`/`Order` collections already exist.