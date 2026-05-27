"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const stripe_1 = __importDefault(require("stripe"));
const cart_model_1 = __importDefault(require("../model/cart_model"));
const order_model_1 = __importDefault(require("../model/order_model"));
const payment_model_1 = __importDefault(require("../model/payment_model"));
const product_model_1 = __importDefault(require("../model/product_model"));
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key missing. Check .env");
}
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
const stripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error("Webhook verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.log("STRIPE WEBHOOK RECEIVED:", event.type);
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const user_id = session.metadata.user_id;
        const cart_id = session.metadata.cart_id;
        const payment_intent_id = session.payment_intent;
        const cart = await cart_model_1.default.findById(cart_id).populate("items.product_id");
        if (!cart)
            return res.status(400).send("Cart not found");
        const order_items = cart.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.cart_quantity,
            price_at_purchase: item.product_id.product_price,
        }));
        const total_amount = order_items.reduce((sum, i) => sum + i.quantity * i.price_at_purchase, 0);
        for (const item of cart.items) {
            if (item.cart_quantity > item.product_id.product_quantity) {
                return res.status(400).send("Not enough stock");
            }
        }
        // 1. Create ORDER first
        const order = await order_model_1.default.create({
            user_id,
            cart_id,
            order_items,
            total_amount,
            order_status: "paid",
        });
        for (const item of order_items) {
            await product_model_1.default.findByIdAndUpdate(item.product_id, { $inc: { product_quantity: -item.quantity } }, { new: true });
        }
        // 2. Create PAYMENT linked to order
        const paymentRecord = await payment_model_1.default.create({
            user_id,
            order_id: order._id,
            stripe_payment_intent: payment_intent_id,
            amount_paid: total_amount,
            currency: "aud",
            payment_status: "succeeded",
        });
        // 3. Update order with payment ID
        order.payment_id = paymentRecord._id;
        await order.save();
        // 4. Clear Cart
        await cart_model_1.default.findByIdAndDelete(cart_id);
        console.log("ORDER CREATED:", order._id);
    }
    res.json({ received: true });
};
exports.stripeWebhook = stripeWebhook;
