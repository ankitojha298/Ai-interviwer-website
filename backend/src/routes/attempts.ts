import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import Attempt from '../models/Attempt';
import * as aiService from '../services/aiService';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up disk storage for large video files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Create a new attempt (starts an interview session)
router.post('/start', async (req, res) => {
    try {
        const { questionId, userId } = req.body;
        const newAttempt = new Attempt({
            questionId,
            userId: userId || 'anonymous_user'
        });
        await newAttempt.save();
        res.status(201).json(newAttempt);
    } catch (error) {
        res.status(500).json({ error: 'Failed to start attempt' });
    }
});

// Upload video/audio recording for an attempt
router.post('/:id/upload', upload.single('recording'), async (req, res) => {
    try {
        const attemptId = req.params.id;
        const attempt = await Attempt.findById(attemptId).populate('questionId');
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const videoPath = path.join(uploadDir, req.file.filename);
        attempt.videoUrl = `/uploads/${req.file.filename}`;

        // AI Pipeline
        const question = attempt.questionId as any; // Type workaround for populated field

        // 1. STT (Whisper)
        const transcript = await aiService.transcribeAudio(videoPath);
        attempt.transcription = transcript;

        // 2. Sentiment Analysis
        const sentiment = aiService.analyzeSentiment(transcript);
        attempt.sentimentAnalysis = sentiment;
        req.app.get('io').emit('sentiment_update', sentiment);

        // 3. Evaluation (GPT-4o)
        if (question && question.title) {
            const evaluation = await aiService.evaluateAnswer(
                { title: question.title, description: question.description, keywords: question.keywords },
                transcript
            );
            attempt.aiFeedback = evaluation;
            req.app.get('io').emit('evaluation_complete', evaluation);
        }

        await attempt.save();

        res.json({ message: 'Recording uploaded and analyzed successfully', attempt });
    } catch (error) {
        console.error('Upload Endpoint Error:', error);
        res.status(500).json({ error: 'Failed to upload and analyze recording' });
    }
});

// Submit code for evaluation
router.post('/:id/code', async (req, res) => {
    try {
        const attemptId = req.params.id;
        const { code } = req.body;

        if (!code) return res.status(400).json({ error: 'Code is required' });

        const attempt = await Attempt.findById(attemptId).populate('questionId');
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

        attempt.codeSubmitted = code;
        const question = attempt.questionId as any;

        if (question && question.title) {
            const evaluation = await aiService.evaluateCode(
                { title: question.title, description: question.description, keywords: question.keywords },
                code
            );
            attempt.codeFeedback = evaluation;
            req.app.get('io').emit('code_evaluation_complete', evaluation);
        }

        await attempt.save();
        res.json({ message: 'Code evaluated successfully', attempt, evaluation: attempt.codeFeedback });
    } catch (error) {
        console.error('Code Evaluation Error:', error);
        res.status(500).json({ error: 'Failed to evaluate code' });
    }
});

export default router;
