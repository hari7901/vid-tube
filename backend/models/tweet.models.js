import mongoose, { Schema } from "mongoose";

const tweetsSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Tweet = mongoose.model("Tweet", tweetsSchema);
