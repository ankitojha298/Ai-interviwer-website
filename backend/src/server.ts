import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import questionsRouter from './routes/questions';
import attemptsRouter from './routes/attempts';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.set('io', io);

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
export const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/api/questions', questionsRouter);
app.use('/api/attempts', attemptsRouter);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proctorai';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'ProctorAI API is running' });
});

io.on('connection', (socket: any) => {
    console.log(`User connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
