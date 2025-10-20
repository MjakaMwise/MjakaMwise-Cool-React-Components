'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

// MediaPipe types
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

const HandGestureScroll: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [gesture, setGesture] = useState<string>('None');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const scrollSpeedRef = useRef(5);

  useEffect(() => {
    // Load MediaPipe scripts
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const loadScripts = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
        setScriptsLoaded(true);
      } catch (error) {
        console.error('Failed to load MediaPipe scripts:', error);
      }
    };

    loadScripts();
  }, []);

  const detectGesture = (landmarks: any) => {
    if (!landmarks || landmarks.length === 0) return 'None';

    // Get key landmark points
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    // Calculate distances
    const indexExtended = indexTip.y < indexPip.y - 0.05;
    const middleClosed = middleTip.y > middlePip.y;
    const ringClosed = ringTip.y > ringPip.y;
    const pinkyClosed = pinkyTip.y > pinkyPip.y;

    // All fingers closed (fist)
    const allFingersClosed = 
      indexTip.y > indexPip.y &&
      middleClosed &&
      ringClosed &&
      pinkyClosed;

    if (allFingersClosed) {
      return 'Index';
    }

    // Index finger up, others down
    if (indexExtended && middleClosed && ringClosed && pinkyClosed) {
      return 'Fist';
    }

    return 'None';
  };

  const startCamera = async () => {
    if (!scriptsLoaded || !videoRef.current || !canvasRef.current) return;

    try {
      const Hands = (window as any).Hands;
      const Camera = (window as any).Camera;

      handsRef.current = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      handsRef.current.onResults((results: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame
        if (results.image) {
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        }

        // Draw hand landmarks
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          
          // Draw connections
          const drawUtils = (window as any).drawConnectors;
          const drawLandmarks = (window as any).drawLandmarks;
          const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS;

          if (drawUtils && drawLandmarks && HAND_CONNECTIONS) {
            drawUtils(ctx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
            drawLandmarks(ctx, landmarks, {color: '#FF0000', lineWidth: 1, radius: 3});
          }

          // Detect gesture
          const detectedGesture = detectGesture(landmarks);
          setGesture(detectedGesture);

          // Perform scroll action
          if (detectedGesture === 'Index') {
            window.scrollBy(0, -scrollSpeedRef.current);
          } else if (detectedGesture === 'Fist') {
            window.scrollBy(0, scrollSpeedRef.current);
          }
        } else {
          setGesture('None');
        }
      });

      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      await cameraRef.current.start();
      setIsActive(true);
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    if (handsRef.current) {
      handsRef.current.close();
    }
    setIsActive(false);
    setGesture('None');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Hand Gesture Scroll Control</h1>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Control page scrolling with hand gestures:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-2xl">☝️</span>
                <span><strong>Index Finger Up:</strong> Scroll Up</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-2xl">✊</span>
                <span><strong>Closed Fist:</strong> Scroll Down</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={startCamera}
              disabled={!scriptsLoaded || isActive}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {scriptsLoaded ? 'Start Camera' : 'Loading...'}
            </button>
            <button
              onClick={stopCamera}
              disabled={!isActive}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Stop Camera
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Scroll Speed: {scrollSpeedRef.current}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              defaultValue="5"
              onChange={(e) => scrollSpeedRef.current = parseInt(e.target.value)}
              className="w-full"
            />
          </div>

          {isActive && (
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <p className="text-lg font-semibold text-indigo-900">
                Current Gesture: <span className="text-indigo-600">{gesture}</span>
              </p>
            </div>
          )}

          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="hidden"
              playsInline
            />
            <canvas
              ref={canvasRef}
              width="640"
              height="480"
              className="w-full h-auto"
            />
            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <p className="text-white text-xl">Camera Inactive</p>
              </div>
            )}
          </div>
        </div>

        {/* Demo content to scroll through */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Demo Content</h2>
          <p className="text-gray-600">
            This is demo content to test the scrolling functionality. Use your hand gestures to scroll through this page!
          </p>
          {[...Array(20)].map((_, i) => (
            <div key={i} className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Section {i + 1}</h3>
              <p className="text-gray-600">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                Use your hand gestures to navigate through this content!
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HandGestureScroll;