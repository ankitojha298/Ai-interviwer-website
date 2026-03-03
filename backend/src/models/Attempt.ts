import mongoose, { Document, Schema } from 'mongoose';

export interface IAttempt extends Document {
    questionId: mongoose.Types.ObjectId;
    userId: string; // Mock user ID for now
    videoUrl?: string; // S3/Cloudinary URL or local path
    audioUrl?: string; // Extracted audio for Whisper
    transcription?: string; // STT result
    codeSubmitted?: string; // Code from Monaco Editor
    aiFeedback?: {
        technicalAccuracyScore: number;
        communicationScore: number;
        feedbackText: string;
        keywordsMentioned: string[];
    };
    codeFeedback?: {
        score: number;
        feedback: string;
    };
    sentimentAnalysis?: {
        confidenceScore: number; // e.g. 0-100%
        notes: string;
    };
}

const AttemptSchema: Schema = new Schema({
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    userId: { type: String, default: 'anonymous_user' },
    videoUrl: { type: String },
    audioUrl: { type: String },
    transcription: { type: String },
    codeSubmitted: { type: String },
    aiFeedback: {
        technicalAccuracyScore: { type: Number },
        communicationScore: { type: Number },
        feedbackText: { type: String },
        keywordsMentioned: [{ type: String }],
    },
    codeFeedback: {
        score: { type: Number },
        feedback: { type: String },
    },
    sentimentAnalysis: {
        confidenceScore: { type: Number },
        notes: { type: String },
    }
}, { timestamps: true });

export default mongoose.model<IAttempt>('Attempt', AttemptSchema);
