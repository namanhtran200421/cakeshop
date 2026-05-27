require("dotenv").config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { stripeWebhook } from "./router/webhook";

import contact_router from "./router/contact_router";
import product_router from "./router/product_router";
import cart_router from "./router/cart_router";
import order_router from "./router/order_router";

const app = express();

const corsOptions = {
  origin: [
    "http://localhost:4200",
    "https://rachel-cake-shop.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// CORS must be before routes
app.use(cors(corsOptions));

// Stripe webhook must stay before express.json()
app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// Normal JSON parsing for the rest
app.use(express.json());

// API routers
app.use("/api", contact_router);
app.use("/api", product_router);
app.use("/api", cart_router);
app.use("/api", order_router);

app.get("/", (_, res) => res.send("Backend running"));

mongoose
  .connect(process.env.MONGO_DB as string)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB connection error", err));

app.listen(process.env.PORT_NO, () =>
  console.log("Server running on", process.env.PORT_NO)
);