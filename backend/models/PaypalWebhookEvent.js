const mongoose = require("mongoose");

const PaypalWebhookEventSchema = new mongoose.Schema(
  {
    paypalEventId: {
      type: String,
      required: true,
      unique: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
      default: null,
    },
    paypalSubscriptionID: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["processing", "processed", "failed"],
      default: "processing",
    },
    summary: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PaypalWebhookEvent", PaypalWebhookEventSchema);
