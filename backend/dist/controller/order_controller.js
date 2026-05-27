"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestOrder = exports.list_orders = exports.start_checkout = void 0;
const cart_model_1 = __importDefault(require("../model/cart_model"));
const user_model_1 = __importDefault(require("../model/user_model"));
const order_model_1 = __importDefault(require("../model/order_model"));
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
const start_checkout = async function (req, res) {
    try {
        const { guest_id, user_first_name, user_last_name, user_email, user_phone_number, } = req.body;
        if (!guest_id || !user_first_name || !user_last_name || !user_email) {
            return res.status(400).json({ message: "Missing fields" });
        }
        //get cart
        let cart = await cart_model_1.default.findOne({ guest_id }).populate("items.product_id");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }
        //create user
        const user = await user_model_1.default.create({
            user_first_name,
            user_last_name,
            user_email,
            user_phone_number,
        });
        //transfer guest id cart to user object
        cart.user_id = user._id;
        // cart.guest_id = null;
        await cart.save();
        //line items for stripe
        const line_items = cart.items.map((item) => ({
            price_data: {
                currency: "aud",
                product_data: {
                    name: item.product_id.product_title,
                },
                unit_amount: item.product_id.product_price * 100,
            },
            quantity: item.cart_quantity,
        }));
        //for prod and dev environment
        // const BASE_URL = "http://localhost:4200/#";
        const BASE_URL = "https://rachel-cake-shop.vercel.app/#";
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            success_url: `${BASE_URL}/order-summary-page`,
            cancel_url: `${BASE_URL}/cart_page`,
            customer_email: user_email,
            metadata: {
                user_id: String(user._id),
                cart_id: String(cart._id),
            },
            line_items,
        });
        return res
            .status(200)
            .json({ message: "Checkout created", url: session.url, user_id: user._id });
    }
    catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ message: "Server error", error: err.message });
    }
};
exports.start_checkout = start_checkout;
const list_orders = async (req, res) => {
    try {
        const { user_id } = req.params;
        if (!user_id) {
            return res.status(400).json({ message: "Missing user_id" });
        }
        const orders = await order_model_1.default.find({ user_id })
            .populate("order_items.product_id")
            .populate("payment_id")
            .sort({ createdAt: -1 });
        return res.status(200).json({ orders });
    }
    catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.list_orders = list_orders;
const getLatestOrder = async (req, res) => {
    try {
        const { user_id } = req.params;
        const order = await order_model_1.default.findOne({ user_id })
            .populate("order_items.product_id")
            .populate("user_id")
            .sort({ createdAt: -1 });
        if (!order) {
            return res.status(404).json({ message: "No orders found" });
        }
        return res.json({ order });
    }
    catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};
exports.getLatestOrder = getLatestOrder;
