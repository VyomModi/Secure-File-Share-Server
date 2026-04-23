import mongoose, { Schema, Document } from "mongoose";

export interface ISharedSnippet extends Document {
  title: string;
  code: string;
  language: string;
  ownerUserId: mongoose.Types.ObjectId;
  shareId: string;   // short unique ID users share with each other
  createdAt: Date;
}

const SharedSnippetSchema = new Schema<ISharedSnippet>(
  {
    title:       { type: String, required: true, maxlength: 100 },
    code:        { type: String, required: true, maxlength: 100_000 },
    language:    { type: String, default: "plaintext" },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shareId:     { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export const SharedSnippetModel = mongoose.model<ISharedSnippet>(
  "SharedSnippet",
  SharedSnippetSchema
);
