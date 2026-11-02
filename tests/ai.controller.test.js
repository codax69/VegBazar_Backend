import { jest } from "@jest/globals";

const mockCreateCompletion = jest.fn();

jest.unstable_mockModule("../src/utility/groq.client.js", () => ({
  getGroqClient: jest.fn(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  })),
  GROQ_MODEL: "llama-3.3-70b-versatile",
}));

jest.unstable_mockModule("../src/utility/ai.tools.js", () => ({
  aiToolSchemas: [],
  runTool: jest.fn(),
}));

const { runTool } = await import("../src/utility/ai.tools.js");
const { chatWithAI } = await import("../src/controller/ai.controller.js");

describe("ai.controller - chatWithAI", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      user: { id: "user123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it("calls next with 400 error if messages body parameter is missing or empty", async () => {
    req.body.messages = [];
    await chatWithAI(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode || err.status).toBe(400);
  });

  it("calls next with 401 error if user is not authenticated", async () => {
    req.user = null;
    req.body.messages = [{ role: "user", content: "Hi" }];
    await chatWithAI(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode || err.status).toBe(401);
  });

  it("processes messages, strips client system prompt, calls Groq and returns response", async () => {
    req.body.messages = [
      { role: "system", content: "Client fake prompt" },
      { role: "user", content: "Suggest healthy vegetables" },
    ];

    mockCreateCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Here are some great options: Spinach and Carrots.",
          },
        },
      ],
    });

    await chatWithAI(req, res, next);

    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
    const sentMessages = mockCreateCompletion.mock.calls[0][0].messages;
    
    // First message must be server system prompt
    expect(sentMessages[0].role).toBe("system");
    expect(sentMessages[0].content).not.toContain("Client fake prompt");
    // User message preserved
    expect(sentMessages[1]).toEqual({ role: "user", content: "Suggest healthy vegetables" });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      reply: "Here are some great options: Spinach and Carrots.",
      actions: [],
    });
  });

  it("handles tool calling loop and collects action cards", async () => {
    req.body.messages = [{ role: "user", content: "Search spinach" }];

    // First completion returns a tool call
    mockCreateCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_1",
                function: {
                  name: "search_products",
                  arguments: JSON.stringify({ query: "spinach" }),
                },
              },
            ],
          },
        },
      ],
    });

    // Mock runTool execution
    runTool.mockResolvedValueOnce({
      success: true,
      products: [{ _id: "v1", name: "Spinach", price: 30, unit: "kg", stock: 10 }],
    });

    // Second completion after tool execution returns final text
    mockCreateCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "I found Spinach for ₹30/kg.",
          },
        },
      ],
    });

    await chatWithAI(req, res, next);

    expect(runTool).toHaveBeenCalledWith("search_products", { query: "spinach" }, "user123");
    expect(mockCreateCompletion).toHaveBeenCalledTimes(2);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      reply: "I found Spinach for ₹30/kg.",
      actions: [
        {
          type: "products",
          items: [{ _id: "v1", name: "Spinach", price: 30, unit: "kg", stock: 10 }],
        },
      ],
    });
  });
});
