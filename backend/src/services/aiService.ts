import OpenAI from 'openai';
import fs from 'fs';
import * as natural from 'natural';

// Fallback in case there is no API key during development testing
const dummyMode = !process.env.OPENAI_API_KEY;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

/**
 * Transcribe a media file using Whisper API
 */
export const transcribeAudio = async (filePath: string): Promise<string> => {
    if (dummyMode) {
        console.log('[AI Mock] Transcribing audio', filePath);
        return "This is a mock transcription of the user's answer. I would traverse the graph using DFS and mark nodes as visited to count the islands.";
    }

    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1',
        });
        return transcription.text;
    } catch (error) {
        console.error('Whisper API Error:', error);
        throw new Error('Failed to transcribe audio.');
    }
};

/**
 * Evaluate the transcript using GPT-4o
 */
export const evaluateAnswer = async (
    questionDetails: { title: string; description: string; keywords: string[] },
    transcript: string
) => {
    if (dummyMode) {
        console.log('[AI Mock] Evaluating answer');
        return {
            technicalAccuracyScore: 85,
            communicationScore: 90,
            feedbackText: "Great job explaining the approach. You correctly identified DFS as the right algorithm.",
            keywordsMentioned: ['DFS', 'visited']
        };
    }

    try {
        const prompt = `
      Act as an SDE interviewer. 
      The candidate was asked the question: "${questionDetails.title}"
      Description: "${questionDetails.description}"
      Expected Keywords: ${questionDetails.keywords.join(', ')}
      
      Candidate's Answer Transcript:
      "${transcript}"
      
      Rate this answer on:
      1. Technical accuracy (0-100)
      2. Communication (0-100)
      3. Constructive feedback
      4. Detect which of the expected keywords they mentioned.
      
      Respond STRICTLY in JSON format:
      {
        "technicalAccuracyScore": <number>,
        "communicationScore": <number>,
        "feedbackText": "<string>",
        "keywordsMentioned": ["<string>"]
      }
    `;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // The requested model
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return result;
    } catch (error) {
        console.error('GPT Evaluation Error:', error);
        throw new Error('Failed to evaluate answer.');
    }
};

/**
 * Perform basic sentiment analysis using 'natural' library
 */
export const analyzeSentiment = (text: string) => {
    const Analyzer = natural.SentimentAnalyzer;
    const stemmer = natural.PorterStemmer;
    const analyzer = new Analyzer('English', stemmer, 'afinn');

    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text) || [];

    const score = analyzer.getSentiment(tokens);

    // Normalize score (-5 to 5 roughly) to a 0-100 confidence scale
    let confidence = 50 + (score * 10);
    if (confidence > 100) confidence = 100;
    if (confidence < 0) confidence = 0;

    let notes = "Neutral confidence.";
    if (confidence > 65) text = "Candidate sounded highly confident and positive.";
    if (confidence < 35) text = "Candidate seemed nervous or unsure.";

    return { confidenceScore: Math.round(confidence), notes };
};

/**
 * Evaluate submitted code using GPT-4o
 */
export const evaluateCode = async (
    questionDetails: { title: string; description: string; keywords: string[] },
    code: string
) => {
    if (dummyMode) {
        return {
            score: 95,
            feedback: "The solution is an optimal O(n) approach using a Hash Map."
        };
    }

    try {
        const prompt = `
      Act as an SDE interviewer. 
      The candidate was asked the question: "${questionDetails.title}"
      Description: "${questionDetails.description}"
      
      Candidate's Submitted Code:
      \`\`\`
      ${code}
      \`\`\`
      
      Rate this code on correctness, efficiency, and readibility.
      
      Respond STRICTLY in JSON format:
      {
        "score": <number 0-100>,
        "feedback": "<string: concise feedback>"
      }
    `;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return result;
    } catch (error) {
        console.error('GPT Code Evaluation Error:', error);
        throw new Error('Failed to evaluate code.');
    }
};
