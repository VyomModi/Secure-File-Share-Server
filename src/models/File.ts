import mongoose, { Schema, Document } from "mongoose";

export interface IFile extends Document {
    filename: string;
    encryptedFilePath: string;
    ownerUserId: mongoose.Types.ObjectId;
    uploadDate: Date;
    sha256Hash: string;
}

const FileSchema = new Schema<IFile>(
    {
        filename: { type: String, required: true },
        encryptedFilePath: { type: String, required: true },
        ownerUserId: { type: Schema.Types.ObjectId,ref: "User", required: true },
        uploadDate: { type: Date, default: Date.now },
        sha256Hash: { type: String, required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: true },
    }
)

export const FileModel = mongoose.model<IFile>("File", FileSchema);