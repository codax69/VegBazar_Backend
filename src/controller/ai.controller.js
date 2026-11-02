import { ApiError } from "../utility/ApiError.utility.js";
import { asyncHandler } from "../utility/AsyncHandler.utility.js";
import { getGroqClient, GROQ_MODEL } from "../utility/groq.client.js";
import { aiToolSchemas, runTool } from "../utility/ai.tools.js";

const MAX_HISTORY_MESSAGES = 6;
const MAX_TOOL_ROUNDS = 3;

const SYSTEM_PROMPT = `You are VegBazar AI Assistant.
Rules:
1. Ground recommendations in search_products results. Never invent products/prices.
2. Call add_to_cart ONLY after user confirms.
3. Call place_order ONLY after confirming address & COD.
4. Keep answers brief & helpful.`;

const chatWithAI = asyncHandler(async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError(400, "Request body must contain a non-empty 'messages' array.");
  }

  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    throw new ApiError(401, "User authentication required.");
  }

  // Sanitize messages: strip system role messages
  const sanitizedMessages = messages.filter((msg) => msg && msg.role !== "system");

  // Keep last MAX_HISTORY_MESSAGES to minimize input token costs
  const recentMessages = sanitizedMessages.slice(-MAX_HISTORY_MESSAGES);

  const conversation = [
    { role: "system", content: SYSTEM_PROMPT },
    ...recentMessages,
  ];

  const groq = getGroqClient();
  const actions = [];
  let rounds = 0;
  let finalReply = "";

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: conversation,
        tools: aiToolSchemas,
        tool_choice: "auto",
        temperature: 0.2, // Low temp for accurate tool calling
        max_tokens: 300,   // Low max output tokens to cut token expense
      });
    } catch (err) {
      if (err?.status === 400 || err?.message?.includes("tool")) {
        console.warn("Groq tool call error, retrying without tools:", err.message);
        completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: conversation,
          temperature: 0.2,
          max_tokens: 300,
        });
      } else {
        throw err;
      }
    }

    const choiceMessage = completion.choices?.[0]?.message;

    if (!choiceMessage) {
      throw new ApiError(502, "No response received from Groq AI service.");
    }

    // Append assistant response to history
    conversation.push(choiceMessage);

    if (choiceMessage.content) {
      finalReply = choiceMessage.content;
    }

    // Check if model wants to invoke tools
    const toolCalls = choiceMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      break;
    }

    // Execute each requested tool call
    for (const toolCall of toolCalls) {
      const rawToolName = toolCall.function?.name || "";
      const toolName = rawToolName.split(" ")[0].split("{")[0].trim();

      let args = {};
      try {
        args = JSON.parse(toolCall.function?.arguments || "{}");
      } catch (e) {
        args = {};
      }

      const result = await runTool(toolName, args, userId);

      // Collect UI action cards
      if (toolName === "search_products" && result?.success && result?.products) {
        actions.push({ type: "products", items: result.products });
      } else if (
        (toolName === "view_cart" || toolName === "add_to_cart" || toolName === "remove_from_cart") &&
        result?.success &&
        result?.cart
      ) {
        actions.push({ type: "cart", cart: result.cart });
      } else if (toolName === "place_order" && result?.success && result?.order_confirmation) {
        actions.push({ type: "order_confirmation", order: result.order_confirmation });
      }

      // Add tool output to conversation
      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return res.status(200).json({
    success: true,
    reply: finalReply || "How can I help you with VegBazar today?",
    actions,
  });
});

export { chatWithAI };
