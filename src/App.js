import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.interimResults = true;
const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');
export default function SpeechRecognitionComponent() {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef(null);
  const finalTextRef = useRef('');
  const recognitionRef = useRef(recognition);

  useEffect(() => {
    socket.on('stop_mike', () => {
      console.log('stop_mike');
      stopRecognition();
    });
    socket.on('receive_audio', (data) => {
      stopRecognition();
      setIsPlaying(true);
      const audio = new Audio(data.audioUrl);
      audio.play();
      audio.onended = () => {
        setIsPlaying(false)
        startRecognition();
      };
    });

    socket.on('error', (errorMessage) => {
      console.error('Server error:', errorMessage);
    });

    return () => {
      socket.off('receive_audio');
      socket.off('error');
    };
  }, [isListening, isPlaying]);


  const handleSilence = useCallback(async () => {
    if (finalTextRef.current) {
      stopRecognition();

      try {
        setIsPlaying(true)
        console.log("message: ", finalTextRef.current)
        socket.emit('recognized_speech', finalTextRef.current);
        finalTextRef.current = '';
      } catch (error) {
        // setError(`Failed to send text to API: ${error.message}`);
      }
    }
  }, []);

  const startRecognition = () => {
    console.log('Attempting to start recognition');
    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('Recognition started successfully');
    } catch (error) {
      // console.error('Error starting recognition:', error);
      // setError(`Error starting recognition: ${error.message}`);
    }
  };

  const stopRecognition = () => {
    console.log('Attempting to stop recognition');
    try {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('Recognition stopped successfully');
    } catch (error) {
      console.error('Error stopping recognition:', error);
      // setError(`Error stopping recognition: ${error.message}`);
    }
  };

  useEffect(() => {
    recognitionRef.current.onstart = () => {
      console.log('SpeechRecognition.onstart event fired');
      setIsListening(true);
    };

    recognitionRef.current.onend = () => {
      console.log('SpeechRecognition.onend event fired');
      setIsListening(false);
    };

    recognitionRef.current.onresult = (event) => {
      console.log('SpeechRecognition.onresult event fired');
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      finalTextRef.current = finalTextRef.current + finalTranscript;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(handleSilence, 2000);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('SpeechRecognition.onerror event fired:', event.error);
      setIsListening(false);
    };

    return () => {
      stopRecognition();
    };
  }, [handleSilence]);

  const startListening = () => {
    finalTextRef.current = '';
    startRecognition();
  };

  const stopListening = () => {
    stopRecognition();
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Speech Recognition</h1>
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={startListening}
          disabled={isListening || isPlaying}
          style={{
            marginRight: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: isListening || isPlaying ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: isListening || isPlaying ? 'not-allowed' : 'pointer'
          }}
        >
          Start Recording
        </button>
        <button
          onClick={stopListening}
          disabled={!isListening}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: !isListening ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: !isListening ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Recording
        </button>
      </div>
      <p style={{ marginBottom: '0.5rem' }}>Status: {isListening ? 'Listening...' : 'Not listening'}</p>
    </div>
  );
}