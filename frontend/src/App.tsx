import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';
import VideoRecorder from './VideoRecorder';

const socket = io('http://localhost:5000');

function App() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [feedback, setFeedback] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [question, setQuestion] = useState<any>(null);
  const [code, setCode] = useState('// Write your solution here');
  const [codeFeedback, setCodeFeedback] = useState<any>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes

  useEffect(() => {
    socket.on('evaluation_complete', (data) => {
      setFeedback(data);
      setUploadStatus('');
    });

    return () => {
      socket.off('evaluation_complete');
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (sessionStarted && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [sessionStarted, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async () => {
    try {
      const questionsRes = await axios.get('http://localhost:5000/api/questions');
      const allQs = questionsRes.data;

      if (!allQs || allQs.length === 0) {
        console.error('No questions found in DB. Please run /api/questions/seed');
        alert('No questions in DB, please seed first!');
        return;
      }

      setQuestions(allQs);
      setCurrentIndex(0);
      const firstQuestion = allQs[0];

      setQuestion(firstQuestion);
      setCode(firstQuestion.starterCode || '// Write your solution here');

      // 2. Start the attempt with the real question ID
      const res = await axios.post('http://localhost:5000/api/attempts/start', {
        questionId: firstQuestion._id,
      });

      setAttemptId(res.data._id);
      setSessionStarted(true);
    } catch (err) {
      console.error('Error starting session', err);
    }
  };

  const handleRecordingComplete = async (blob: Blob) => {
    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('recording', blob, 'interview.webm');

    try {
      await axios.post(`http://localhost:5000/api/attempts/${attemptId}/upload`, formData);
      setUploadStatus('Upload successful! AI is analyzing...');
    } catch (error) {
      console.error('Upload failed', error);
      setUploadStatus('Upload failed. Please try again.');
    }
  };

  const handleSubmitCode = async () => {
    setIsSubmittingCode(true);
    try {
      const resp = await axios.post(`http://localhost:5000/api/attempts/${attemptId}/code`, { code });

      const evalData = resp.data.evaluation;
      if (evalData) {
        setCodeFeedback(evalData);
      } else {
        setCodeFeedback({ score: 0, feedback: "Evaluation returned empty. Please try again." });
      }
      setIsSubmittingCode(false);
    } catch (error) {
      console.error('Failed to submit code', error);
      setCodeFeedback({ score: 0, feedback: "An error occurred while evaluating your code via AI." });
      setIsSubmittingCode(false);
    }
  };

  const handleNextQuestion = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      const nextQ = questions[nextIndex];
      setQuestion(nextQ);
      setCode(nextQ.starterCode || '// Write your solution here');
      setCodeFeedback(null);
      setUploadStatus('');
      setFeedback(null);

      const res = await axios.post('http://localhost:5000/api/attempts/start', {
        questionId: nextQ._id,
      });
      setAttemptId(res.data._id);
    } else {
      alert("🎉 Interview Complete! You resolved all questions.");
      setSessionStarted(false);
    }
  };

  return (
    <>
      <header className="glass-header">
        <h2 className="gradient-text" style={{ fontSize: '1.5rem', margin: 0 }}>ProctorAI</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Dashboard</button>
        </div>
      </header>

      <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>SDE Mock Interview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '24px' }}>
            Practice your DSA and System Design algorithms with an AI interviewer.
          </p>

          {!sessionStarted && (
            <button className="btn btn-primary" onClick={handleStartSession} style={{ fontSize: '1.2rem', padding: '16px 32px' }}>
              Begin Session
            </button>
          )}
        </div>

        {sessionStarted && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Left side: Problem & Editor */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Question: {question?.title}</h3>
                <span style={{ color: timeLeft < 300 ? 'var(--accent)' : 'var(--secondary)', fontWeight: 'bold' }}>
                  ⏳ {formatTime(timeLeft)}
                </span>
              </div>
              <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
                {question?.description}
              </p>
              <div style={{ flex: 1, minHeight: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitCode}
                  disabled={isSubmittingCode}
                >
                  {isSubmittingCode ? 'Evaluating...' : '🚀 Submit Code'}
                </button>
              </div>

              {codeFeedback && (
                <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', backgroundColor: codeFeedback.score >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', border: `1px solid ${codeFeedback.score >= 70 ? '#10B981' : '#F43F5E'}` }}>
                  <h4 style={{ color: codeFeedback.score >= 70 ? '#10B981' : '#F43F5E', marginBottom: '8px' }}>
                    {codeFeedback.score >= 70 ? '✅ Right Answer! (Score: ' : '❌ Needs Work (Score: '} {codeFeedback.score}/100)
                  </h4>
                  <p style={{ fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '16px' }}>{codeFeedback.feedback}</p>

                  {codeFeedback.score >= 70 && (
                    <button className="btn btn-primary" onClick={handleNextQuestion} style={{ width: '100%' }}>
                      Next Question ➡️
                    </button>
                  )}
                  {codeFeedback.score < 70 && (
                    <button className="btn btn-accent" onClick={() => setCodeFeedback(null)} style={{ width: '100%', background: 'transparent', border: '1px solid var(--accent)' }}>
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right side: Video Recorder & AI Feedback */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '20px' }}>Virtual Interviewer</h3>
              <VideoRecorder onRecordingComplete={handleRecordingComplete} />

              {uploadStatus && (
                <div style={{ marginTop: '20px', textAlign: 'center', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-dark)' }}>
                  {uploadStatus}
                </div>
              )}

              {feedback && (
                <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--secondary)' }}>
                  <h4 style={{ color: 'var(--secondary)', marginBottom: '8px' }}>AI Feedback Score</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span>Technical Accuracy: <strong>{feedback.technicalAccuracyScore}%</strong></span>
                    <span>Communication: <strong>{feedback.communicationScore}%</strong></span>
                  </div>
                  <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{feedback.feedbackText}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default App;
