import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion extends Document {
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    topic: string; // e.g., 'DP', 'Graphs', 'Arrays'
    keywords: string[]; // e.g., ['Memoization', 'Cache', 'O(n)']
    starterCode: string;
}

const QuestionSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    topic: { type: String, required: true },
    keywords: [{ type: String }],
    starterCode: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
