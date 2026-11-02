import Vegetable from "../Model/vegetable.model.js";
import Cart from "../Model/cart.model.js";
import Order from "../Model/order.model.js";

// Compressed tool schemas for minimal token consumption
export const aiToolSchemas = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search in-stock vegetables by query or price.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          maxPrice: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "view_cart",
      description: "View user cart items and total.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Add items to user cart.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                productId: { type: "string" },
                quantity: { type: "number" },
                weight: { type: "string" },
              },
              required: ["productId", "quantity"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_from_cart",
      description: "Remove product from user cart.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          weight: { type: "string" },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "place_order",
      description: "Place COD order with delivery address.",
      parameters: {
        type: "object",
        properties: {
          shippingAddress: { type: "string" },
          paymentMethod: { type: "string", enum: ["COD", "ONLINE"] },
        },
        required: ["shippingAddress", "paymentMethod"],
      },
    },
  },
];

const getPriceForWeight = (vegetable, weightLabel = "1kg") => {
  const normWeight = weightLabel.toLowerCase().trim();
  if (vegetable.prices) {
    if (normWeight === "1kg" && vegetable.prices.weight1kg > 0) return vegetable.prices.weight1kg;
    if (normWeight === "500g" && vegetable.prices.weight500g > 0) return vegetable.prices.weight500g;
    if (normWeight === "250g" && vegetable.prices.weight250g > 0) return vegetable.prices.weight250g;
    if (normWeight === "100g" && vegetable.prices.weight100g > 0) return vegetable.prices.weight100g;
  }
  const basePrice = vegetable.prices?.weight1kg || vegetable.price || 0;
  if (normWeight === "500g") return Math.round((basePrice / 2) * 100) / 100;
  if (normWeight === "250g") return Math.round((basePrice / 4) * 100) / 100;
  if (normWeight === "100g") return Math.round((basePrice / 10) * 100) / 100;
  return basePrice;
};

const getWeightGrams = (weightLabel = "1kg") => {
  const norm = weightLabel.toLowerCase().trim();
  if (norm === "1kg") return 1000;
  if (norm === "500g") return 500;
  if (norm === "250g") return 250;
  if (norm === "100g") return 100;
  return 1000;
};

export const executeSearchProducts = async ({ query, category, maxPrice }) => {
  const filter = { outOfStock: { $ne: true } };

  if (query || category) {
    const searchTerm = (query || category).trim();
    filter.$or = [
      { name: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ];
  }

  if (maxPrice && typeof maxPrice === "number") {
    filter["prices.weight1kg"] = { $lte: maxPrice };
  }

  const products = await Vegetable.find(filter)
    .select("_id name prices price stockKg stockPieces image outOfStock")
    .limit(5)
    .lean();

  return {
    success: true,
    products: products.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      price: p.prices?.weight1kg || p.price || 0,
      unit: "kg",
      stock: p.stockKg ?? p.stockPieces ?? 0,
      image: p.image || "",
    })),
  };
};

export const executeViewCart = async (userId) => {
  const cart = await Cart.getOrCreateCart(userId);
  await cart.populate("items.product");

  const items = cart.items.map((item) => ({
    productId: item.product?._id?.toString() || item.product?.toString(),
    name: item.product?.name || "Vegetable",
    quantity: item.quantity,
    weight: item.weight,
    price: item.price,
    totalPrice: item.totalPrice,
  }));

  return {
    success: true,
    cart: {
      items,
      subtotal: cart.subtotal,
      deliveryCharges: cart.deliveryCharges,
      total: cart.total,
      itemCount: cart.itemCount,
    },
  };
};

export const executeAddToCart = async (userId, { items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "No items provided to add to cart." };
  }

  const cart = await Cart.getOrCreateCart(userId);

  for (const item of items) {
    const product = await Vegetable.findById(item.productId);
    if (!product) {
      return { error: `Product ID ${item.productId} not found.` };
    }
    if (product.outOfStock || (product.stockKg !== undefined && product.stockKg < item.quantity)) {
      return { error: `Insufficient stock for ${product.name}.` };
    }

    const weightLabel = item.weight || "1kg";
    const unitPrice = getPriceForWeight(product, weightLabel);
    const weightGrams = getWeightGrams(weightLabel);

    await cart.addItem(product._id, item.quantity, unitPrice, weightLabel, weightGrams);
  }

  return await executeViewCart(userId);
};

export const executeRemoveFromCart = async (userId, { productId, weight }) => {
  const cart = await Cart.getOrCreateCart(userId);
  const weightLabel = weight || "1kg";
  
  try {
    await cart.removeItem(productId, weightLabel);
  } catch (err) {
    const idx = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );
    if (idx > -1) {
      cart.items.splice(idx, 1);
      await cart.save();
    } else {
      return { error: "Item not found in cart." };
    }
  }

  return await executeViewCart(userId);
};

export const executePlaceOrder = async (userId, { shippingAddress, paymentMethod }) => {
  if (paymentMethod === "ONLINE") {
    return {
      error: "Online payment via chat is not configured yet. Please select Cash on Delivery (COD).",
    };
  }

  if (paymentMethod !== "COD") {
    return { error: "Only Cash on Delivery (COD) is supported." };
  }

  const cart = await Cart.findOne({ user: userId, status: "active" }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    return { error: "Cart is empty." };
  }

  for (const item of cart.items) {
    const product = await Vegetable.findById(item.product._id);
    if (!product || product.outOfStock || product.stockKg < item.quantity) {
      return { error: `Item ${item.product?.name || "in cart"} is out of stock.` };
    }
  }

  const selectedVegetables = cart.items.map((item) => ({
    vegetable: item.product._id,
    weight: item.weight || "1kg",
    quantity: item.quantity,
    pricePerUnit: item.price,
    subtotal: item.totalPrice,
  }));

  const vegetablesTotal = selectedVegetables.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotalAfterDiscount = vegetablesTotal;
  const deliveryCharges = cart.deliveryCharges || 20;
  const totalAmount = subtotalAfterDiscount + deliveryCharges;
  const generatedOrderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const order = new Order({
    orderType: "custom",
    customerInfo: userId,
    selectedVegetables,
    vegetablesTotal,
    couponDiscount: 0,
    subtotalAfterDiscount,
    deliveryCharges,
    totalAmount,
    finalPayableAmount: totalAmount,
    orderId: generatedOrderId,
    paymentMethod: "COD",
    paymentStatus: "pending",
    orderStatus: "placed",
    specialInstructions: shippingAddress || "Placed via AI Assistant",
  });

  await order.save();

  for (const item of cart.items) {
    await Vegetable.findByIdAndUpdate(item.product._id, {
      $inc: { stockKg: -item.quantity },
    });
  }

  await cart.clearCart();

  return {
    success: true,
    order_confirmation: {
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      paymentMethod: "COD",
      deliveryEstimate: "24-48 Hours",
      itemsCount: selectedVegetables.length,
      shippingAddress,
    },
  };
};

export const runTool = async (toolName, args, userId) => {
  switch (toolName) {
    case "search_products":
      return await executeSearchProducts(args);
    case "view_cart":
      return await executeViewCart(userId);
    case "add_to_cart":
      return await executeAddToCart(userId, args);
    case "remove_from_cart":
      return await executeRemoveFromCart(userId, args);
    case "place_order":
      return await executePlaceOrder(userId, args);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};
