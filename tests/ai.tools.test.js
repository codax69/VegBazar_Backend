import { jest } from "@jest/globals";

// Mock Mongoose models
jest.unstable_mockModule("../src/Model/vegetable.model.js", () => {
  const mockVegetable = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  return { default: mockVegetable };
});

jest.unstable_mockModule("../src/Model/cart.model.js", () => {
  const mockCart = {
    getOrCreateCart: jest.fn(),
    findOne: jest.fn(),
  };
  return { default: mockCart };
});

jest.unstable_mockModule("../src/Model/order.model.js", () => {
  const mockOrder = jest.fn();
  return { default: mockOrder };
});

// Dynamic imports after mocking
const Vegetable = (await import("../src/Model/vegetable.model.js")).default;
const Cart = (await import("../src/Model/cart.model.js")).default;
const Order = (await import("../src/Model/order.model.js")).default;
const {
  executeSearchProducts,
  executeViewCart,
  executeAddToCart,
  executePlaceOrder,
  runTool,
} = await import("../src/utility/ai.tools.js");

describe("AI Tools Executors", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("executeSearchProducts", () => {
    it("returns formatted product list from Vegetable model", async () => {
      const mockProducts = [
        {
          _id: "veg123",
          name: "Palak (Spinach)",
          prices: { weight1kg: 40 },
          stockKg: 10,
          description: "Fresh green spinach",
          image: "http://example.com/palak.jpg",
        },
      ];

      Vegetable.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockProducts),
          }),
        }),
      });

      const res = await executeSearchProducts({ query: "spinach" });
      expect(res.success).toBe(true);
      expect(res.products).toHaveLength(1);
      expect(res.products[0]).toEqual({
        _id: "veg123",
        name: "Palak (Spinach)",
        price: 40,
        unit: "kg",
        stock: 10,
        image: "http://example.com/palak.jpg",
      });
    });
  });

  describe("executeViewCart", () => {
    it("populates and returns user cart summary", async () => {
      const mockCartInstance = {
        _id: "cart123",
        items: [
          {
            product: { _id: "veg123", name: "Palak" },
            quantity: 2,
            weight: "1kg",
            price: 40,
            totalPrice: 80,
          },
        ],
        subtotal: 80,
        deliveryCharges: 20,
        total: 100,
        itemCount: 1,
        populate: jest.fn().mockResolvedValue(true),
      };

      Cart.getOrCreateCart.mockResolvedValue(mockCartInstance);

      const res = await executeViewCart("user123");
      expect(res.success).toBe(true);
      expect(res.cart.items).toHaveLength(1);
      expect(res.cart.total).toBe(100);
    });
  });

  describe("executePlaceOrder", () => {
    it("returns error if paymentMethod is ONLINE", async () => {
      const res = await executePlaceOrder("user123", {
        shippingAddress: "123 Green St",
        paymentMethod: "ONLINE",
      });

      expect(res.error).toBeDefined();
      expect(res.error).toContain("Online payment via chat is not configured yet");
    });

    it("creates COD order, decrements stock, and clears cart", async () => {
      const mockVegetable = {
        _id: "veg123",
        name: "Bhindi",
        stockKg: 5,
        outOfStock: false,
      };

      const mockCartInstance = {
        _id: "cart123",
        items: [
          {
            product: mockVegetable,
            quantity: 2,
            weight: "1kg",
            price: 50,
            totalPrice: 100,
          },
        ],
        deliveryCharges: 20,
        clearCart: jest.fn().mockResolvedValue(true),
      };

      Cart.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCartInstance),
      });

      Vegetable.findById.mockResolvedValue(mockVegetable);
      Vegetable.findByIdAndUpdate.mockResolvedValue(true);

      const mockOrderSave = jest.fn().mockResolvedValue(true);
      Order.mockImplementation(function (data) {
        Object.assign(this, data);
        this.save = mockOrderSave;
      });

      const res = await executePlaceOrder("user123", {
        shippingAddress: "123 Main St",
        paymentMethod: "COD",
      });

      expect(res.success).toBe(true);
      expect(res.order_confirmation.paymentMethod).toBe("COD");
      expect(res.order_confirmation.totalAmount).toBe(120);
      expect(Vegetable.findByIdAndUpdate).toHaveBeenCalledWith("veg123", {
        $inc: { stockKg: -2 },
      });
      expect(mockCartInstance.clearCart).toHaveBeenCalled();
    });
  });

  describe("runTool dispatcher", () => {
    it("dispatches search_products properly", async () => {
      Vegetable.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const res = await runTool("search_products", {}, "user123");
      expect(res.success).toBe(true);
      expect(res.products).toEqual([]);
    });

    it("returns error for unknown tool", async () => {
      const res = await runTool("unknown_tool", {}, "user123");
      expect(res.error).toBe("Unknown tool: unknown_tool");
    });
  });
});
