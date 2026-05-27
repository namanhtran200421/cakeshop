"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_whole_cart = exports.delete_item_in_cart = exports.get_cart = exports.add_cart = void 0;
const cart_model_1 = __importDefault(require("../model/cart_model"));
const product_model_1 = __importDefault(require("../model/product_model"));
const add_cart = async function (req, res) {
    try {
        const { guest_id, product_id, quantity } = req.body;
        if (!guest_id || !product_id || !quantity) {
            return res.status(400).json({ message: "Missing Fields" });
        }
        let cart = await cart_model_1.default.findOne({ guest_id });
        if (!cart) {
            cart = await cart_model_1.default.create({
                guest_id,
                items: [],
                total_price: 0,
            });
        }
        const existing_cart = cart.items.find((item) => item.product_id.toString() === product_id);
        if (existing_cart) {
            existing_cart.cart_quantity += quantity;
        }
        else {
            cart.items.push({
                product_id,
                cart_quantity: quantity,
            });
        }
        let subtotal = 0;
        for (const item of cart.items) {
            const product = await product_model_1.default.findById(item.product_id);
            if (!product) {
                throw new Error("Product does not exist");
            }
            subtotal += product.product_price * item.cart_quantity;
        }
        cart.total_price = subtotal;
        cart.updatedAt = new Date();
        await cart.save();
        return res.json({
            message: "Item added to cart",
            total_price: subtotal,
            cart,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", err });
    }
};
exports.add_cart = add_cart;
const get_cart = async (req, res) => {
    const { guest_id } = req.body;
    const cart = await cart_model_1.default.findOne({ guest_id }).populate("items.product_id");
    return res.json({ cart });
};
exports.get_cart = get_cart;
const delete_item_in_cart = async function (req, res) {
    try {
        const { guest_id, product_id } = req.params;
        if (!guest_id || !product_id) {
            return res
                .status(400)
                .json({ message: "Missing guest_id or product_id" });
        }
        const cart = await cart_model_1.default.findOne({ guest_id }).populate("items.product_id");
        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }
        // Remove the item
        cart.items = cart.items.filter((item) => String(item.product_id?._id || item.product_id) !== String(product_id));
        // Recalculate total AFTER deletion
        let newTotal = 0;
        for (const item of cart.items) {
            const price = item.product_id.product_price;
            newTotal += item.cart_quantity * price;
        }
        cart.total_price = newTotal;
        cart.updatedAt = new Date();
        await cart.save();
        return res.status(200).json({
            message: "Item removed from cart",
            cart,
        });
    }
    catch (err) {
        console.error("Delete item failed:", err);
        return res.status(500).json({
            message: "Internal server error",
            error: err.message,
        });
    }
};
exports.delete_item_in_cart = delete_item_in_cart;
const delete_whole_cart = async function (req, res) {
    try {
        const { guest_id } = req.params;
        if (!guest_id) {
            return res.status(400).json({ message: "Missing guest_id" });
        }
        const cart = await cart_model_1.default.findOne({ guest_id });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        await cart_model_1.default.deleteOne({ guest_id });
        return res.status(200).json({ message: "Cart cleared successfully" });
    }
    catch (err) {
        console.error("Error deleting entire cart:", err);
        return res.status(500).json({
            message: "Server error",
            error: err.message,
        });
    }
};
exports.delete_whole_cart = delete_whole_cart;
