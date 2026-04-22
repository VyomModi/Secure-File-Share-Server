import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
    userId?: mongoose.Types.ObjectId | null;
    action: string;
    timestamp: Date;
    ipAddress?: string | null;
}

const ActivityLogSchema = new Schema<IActivityLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        ipAddress: { type: String, default: null },
    },
    { timestamps: false }
)

export const ActivityLogModel = mongoose.model<IActivityLog>(
  "ActivityLog",
  ActivityLogSchema
);
