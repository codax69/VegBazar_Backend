# Product Requirements Document (PRD)
## VegBazar AI Assistant — Conversational Recipe & Ordering Chatbot

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Owner** | Product |
| **Last updated** | Aug 3, 2026 |

## 1. Overview
An in-app AI chat assistant for VegBazar that recommends healthy recipes based
on a user's stated goal (health condition, diet, occasion), grounds those
recommendations in real, in-stock products, and can carry the user all the
way through adding items to cart and placing an order — without ever storing
the conversation itself.

## 2. Problem Statement
Shoppers often browse VegBazar without a fixed list — they know they want to
"eat healthier" or "cook something quick for the kids" but not which specific
vegetables or how much to buy. Today that requires leaving the app to look up
a recipe, then manually searching and adding each ingredient. That friction
suppresses both order frequency and basket size.

## 3. Goals
- Increase average basket size and order completion rate for undecided shoppers
- Reduce time from "I don't know what to cook" to a placed order
- Offer personalized, health-conscious recipe guidance at the point of shopping
- Lay groundwork for future AI-assisted commerce features (reorder suggestions, seasonal picks, etc.)

## 4. Non-Goals (v1)
- Medical or diagnostic nutrition advice (general healthy-eating guidance only)
- Persisting chat transcripts or building conversation analytics
- Multi-language support beyond what the base model already handles
- Loyalty/rewards or subscription integration

## 5. Target Users
- Health-conscious home cooks (diabetic-friendly, high-protein, weight management, etc.)
- Busy shoppers wanting fast weeknight meal ideas
- Existing VegBazar customers browsing without a specific shopping list

## 6. User Stories
- As a shopper, I want to describe a health goal or occasion so the assistant suggests a recipe using vegetables VegBazar actually has in stock.
- As a shopper, I want the assistant to add the recommended items to my cart once I agree, without me searching manually.
- As a shopper, I want to give my delivery address and payment preference in chat and have my order placed.
- As a shopper, I want confidence that my conversation isn't being saved or tracked after I close the widget.
- As a product owner, I want the assistant to never invent prices or stock, so it never breaks customer trust.

## 7. Functional Requirements
| ID | Requirement |
|---|---|
| FR1 | Chat widget is accessible from any authenticated page in the app. |
| FR2 | Assistant answers recipe/health questions grounded in real catalog data (never invented prices/stock). |
| FR3 | Assistant can add recommended items to the user's cart after explicit user confirmation. |
| FR4 | Assistant can place an order (Cash on Delivery or Online) after confirming delivery address and payment method. |
| FR5 | No conversation transcript is written to any database — only resulting cart/order data persists. |
| FR6 | Assistant declines or redirects gracefully when asked about topics outside vegetables/recipes/health/ordering. |

## 8. Non-Functional Requirements
- **Latency:** target sub-few-second responses for simple replies (Groq's inference is optimized for this); tool-augmented replies may take longer and should show a "thinking" state.
- **Availability:** matches existing API uptime expectations; a Groq outage should degrade gracefully (clear error, no half-finished orders).
- **Privacy:** conversation content is never persisted; only real transactional data (cart, orders) is stored, same as any other order placed through the app.
- **Cost control:** bounded conversation history and tool-call rounds per request to keep per-conversation API cost predictable.

## 9. Success Metrics
- % of chat sessions that result in a completed order
- Average order value: chat-assisted vs. non-chat orders
- Time-to-order for chat-assisted sessions vs. baseline
- Assistant fallback/error rate (should stay low)

## 10. Rollout Plan
1. **Internal beta** — staff/test accounts validate recommendation quality and order correctness.
2. **Limited rollout** — small % of users behind a feature flag; monitor cost, latency, error rate.
3. **General availability** — full rollout once metrics are healthy.

## 11. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Assistant invents a product, price, or stock level | System prompt requires calling `search_products` before any recommendation; no tool, no claim. |
| Runaway Groq API cost from long conversations | Capped message history (last ~20) and tool-call rounds (5) per request. |
| Groq API outage | Controller returns a clean error; no partial cart/order writes occur. |
| Online payment not yet wired to Razorpay | Assistant always offers Cash on Delivery as a working fallback. |

## 12. Open Questions
- Do we want a lightweight feedback signal (thumbs up/down) on assistant replies?
- Is regional-language support (e.g. Hindi/Gujarati) needed for v1 or a fast-follow?
- Should there be a daily per-user message quota to bound cost at scale?