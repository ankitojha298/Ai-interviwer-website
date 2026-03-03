import express from 'express';
import Question from '../models/Question';
import { redisCache } from '../services/redis';

const router = express.Router();

// Get all questions (with optional filtering by topic/difficulty)
router.get('/', async (req, res) => {
    try {
        const { topic, difficulty } = req.query;
        const cacheKey = `questions:${topic || 'all'}:${difficulty || 'all'}`;

        // Try hitting cache first
        const cachedData = await redisCache.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const filter: any = {};
        if (topic) filter.topic = topic;
        if (difficulty) filter.difficulty = difficulty;

        const questions = await Question.find(filter);

        // Set to cache for 1 hour
        await redisCache.setEx(cacheKey, 3600, JSON.stringify(questions));

        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// Seed some initial questions
router.post('/seed', async (req, res) => {
    try {
        const count = await Question.countDocuments();
        if (count > 0) {
            return res.status(400).json({ message: 'Database already seeded' });
        }

        const questions = [
            {
                title: 'Climbing Stairs',
                description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
                difficulty: 'Easy',
                topic: 'DP',
                keywords: ['Memoization', 'Fibonacci', 'Dynamic Programming', 'Base cases'],
                starterCode: 'function climbStairs(n) {\n  // Write your code here\n}'
            },
            {
                title: 'Number of Islands',
                description: 'Given an m x n 2D binary grid grid which represents a map of 1s (land) and 0s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
                difficulty: 'Medium',
                topic: 'Graphs',
                keywords: ['DFS', 'BFS', 'Visited array', 'Connected components'],
                starterCode: 'function numIslands(grid) {\n  // Write your code here\n}'
            }
        ];

        await Question.insertMany(questions);
        res.status(201).json({ message: 'Database seeded with sample questions' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to seed questions' });
    }
});

// Get a single question by ID
router.get('/:id', async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ error: 'Question not found' });
        res.json(question);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch question' });
    }
});

export default router;
