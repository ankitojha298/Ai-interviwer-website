import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface VideoRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onRecordingComplete }) => {
    const webcamRef = useRef<Webcam>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [capturing, setCapturing] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]);

    const handleDataAvailable = useCallback(
        ({ data }: BlobEvent) => {
            if (data.size > 0) {
                setRecordedChunks((prev) => prev.concat(data));
            }
        },
        []
    );

    const handleStartCaptureClick = useCallback(() => {
        setCapturing(true);
        if (webcamRef.current && webcamRef.current.stream) {
            mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            mediaRecorderRef.current.addEventListener(
                'dataavailable',
                handleDataAvailable
            );
            mediaRecorderRef.current.start();
        }
    }, [webcamRef, setCapturing, mediaRecorderRef, handleDataAvailable]);

    const handleStopCaptureClick = useCallback(() => {
        setCapturing(false);
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    }, [mediaRecorderRef, setCapturing]);

    const handleDownload = useCallback(() => {
        if (recordedChunks.length) {
            const blob = new Blob(recordedChunks, {
                type: 'video/webm'
            });
            onRecordingComplete(blob);
            setRecordedChunks([]);
        }
    }, [recordedChunks, onRecordingComplete]);

    return (
        <div className="video-container">
            <Webcam
                audio={true}
                ref={webcamRef}
                muted={true} /* Mute local playback to avoid echo */
                className="video-element"
            />
            <div className="video-overlay">
                {capturing ? (
                    <button className="btn btn-accent" onClick={handleStopCaptureClick}>
                        <span className="recording-indicator"></span> Stop Recording
                    </button>
                ) : (
                    <button className="btn btn-primary" onClick={handleStartCaptureClick}>
                        🎬 Start Mock Interview
                    </button>
                )}
                {recordedChunks.length > 0 && !capturing && (
                    <button className="btn btn-primary" onClick={handleDownload}>
                        ☁️ Upload Video Attempt
                    </button>
                )}
            </div>
        </div>
    );
};

export default VideoRecorder;
