import mongoose, {Schema, Document} from "mongoose";

export interface IUser extends Document {
    username: string;
    email: string;
    passwordHash: string;
    failedLoginAttempts: number;
    accountLockedUntil?: Date | null;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        username: { type: String, required: true, unique: true, index: true },
        email: {type: String, required: true, unique: true, index: true},
        passwordHash: {type: String, required: true},
        failedLoginAttempts: {type: Number, default: 0},
        accountLockedUntil: {type: Date, default: null}
    },
    {
        timestamps: { createdAt: true, updatedAt: true}
    }
)

export const User = mongoose.model<IUser>("User", UserSchema);