# Integration Guide — Wiring the AI Assistant into Your MERN App

This assumes you already have the four backend files and three frontend
files from the scaffold (`backend/src/...` and
`frontend/src/components/VegBazarChat/...`). If not, grab them first — this
guide is just the wiring.

## Backend (Express + MongoDB)

### Step 1 — Install the Groq SDK
```bash
cd VegBazar_Backend
npm install groq-sdk
```

### Step 2 — Add environment variables
In your `.env` (never commit real values):
```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```
Get a key at https://console.groq.com. `GROQ_MODEL` is optional.

### Step 3 — Copy the files in
```
src/utility/groq.client.js
src/utility/ai.tools.js
src/controller/ai.controller.js
src/routes/ai.routes.js
```
These already follow your ES-module + MVC conventions.

### Step 4 — Fix three import paths to match your real code
Open `src/utility/ai.tools.js` and update:
```js
import { productModel } from "../Model/product.model.js"; // your real export name/path
import { cartModel } from "../Model/cart.model.js";        // do you have a Cart model, or do items live on the user?
import { orderModel } from "../Model/order.model.js";      // your real Order field names
```
Then open `src/routes/ai.routes.js` and swap `verifyToken` for whatever your
existing auth middleware export is actually called (e.g. `authenticate`,
`protect`, `isLoggedIn`).

### Step 5 — Mount the route in `app.js`
```js
import aiRoutes from "./src/routes/ai.routes.js";
// ...with your other app.use() calls:
app.use("/api/ai", aiRoutes);
```

### Step 6 — (Optional) Online payments
If you already have a Razorpay helper, export a function
`createRazorpayOrder(amount)` from `src/utility/razorpay.utility.js` —
`ai.tools.js` picks it up automatically. Until then, choosing "ONLINE"
payment in chat will politely tell the user to use Cash on Delivery instead
of faking a successful payment.

### Step 7 — Smoke test with curl
```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <a real JWT>" \
  -d '{"messages":[{"role":"user","content":"suggest something for a quick healthy dinner"}]}'
```
You should get back `{ "success": true, "reply": "...", "actions": [...] }`.

## Frontend (React)

### Step 1 — Copy the component folder in
```
src/components/VegBazarChat/
  ├── VegBazarChat.jsx
  ├── VegBazarChat.css
  └── useAIChat.js
```

### Step 2 — Drop it into your layout (once, near the root)
```jsx
// e.g. in App.jsx, inside your authenticated layout
import VegBazarChat from "./components/VegBazarChat/VegBazarChat";

function App() {
  return (
    <>
      {/* ...rest of your app... */}
      <VegBazarChat getAuthToken={() => localStorage.getItem("token")} />
    </>
  );
}
```
Swap `getAuthToken` for however your app actually stores the JWT (context,
redux, cookie, etc.) — the widget just needs a function that returns the
current bearer token.

### Step 3 — Confirm the proxy/base URL
If your React app is served separately from the API (e.g. CRA dev server on
:3000, Express on :5000), either:
- set a `"proxy": "http://localhost:5000"` entry in your frontend `package.json` (CRA), or
- pass an absolute URL: `<VegBazarChat apiBaseUrl="http://localhost:5000/api/ai" .../>`

### Step 4 — Try it end to end
Log in, click the leaf bubble bottom-right, ask for a recipe, confirm adding
items, then confirm placing an order with a test address and Cash on
Delivery. Check your `Order` collection for the new document.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| `401` on `/api/ai/chat` | Wrong auth middleware name, or token not attached in `getAuthToken` |
| `500` mentioning a Model import | Field/path mismatch in Step 4 above — check your real Model file names |
| Assistant says "cart is empty" right after adding items | `Cart` schema shape differs from the assumed `items: [{product, quantity}]` — adjust `ai.tools.js` |
| "Online payment isn't wired up yet" | Expected until you add `razorpay.utility.js` — use COD to test the full flow meanwhile |
