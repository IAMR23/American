const mongoose = require("mongoose");

const PaypalProductConfigSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "american-karaoke-paypal",
    },
    activePaypalProductId: {
      type: String,
      default: null,
    },
    hiddenPaypalProductIds: {
      type: [String],
      default: [],
    },
    transitionStatus: {
      type: String,
      enum: ["selected", "migrated", "pending_empty", "pending_ambiguous"],
      default: "pending_empty",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "PaypalProductConfig",
  PaypalProductConfigSchema,
);
