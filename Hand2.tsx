'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

// SCROLL SPEED CONFIGURATION (adjust this value)
const SCROLL_SPEED = 8; // pixels per frame (1-20 recommended)

// MediaPipe types
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

const HandGestureScroll2: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPrompt, setShowPrompt] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

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
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    // Calculate finger states
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
      return 'Fist';
    }

    // Index finger up, others down
    if (indexExtended && middleClosed && ringClosed && pinkyClosed) {
      return 'Index';
    }

    return 'None';
  };

  const startCamera = async () => {
    if (!scriptsLoaded || !videoRef.current) return;

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
        // Detect gesture and scroll
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          const detectedGesture = detectGesture(landmarks);

          // Perform scroll action
          if (detectedGesture === 'Index') {
            window.scrollBy(0, -SCROLL_SPEED);
          } else if (detectedGesture === 'Fist') {
            window.scrollBy(0, SCROLL_SPEED);
          }
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
      setShowPrompt(false);
      setPermissionDenied(false);
    } catch (error) {
      console.error('Error starting camera:', error);
      setPermissionDenied(true);
    }
  };

  const handleAllow = () => {
    startCamera();
  };

  const handleDeny = () => {
    setShowPrompt(false);
    setPermissionDenied(true);
  };

  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, []);

  return (
    <>
      {/* Hidden video element */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
      />

      {/* Camera permission prompt */}
      {showPrompt && scriptsLoaded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={handleDeny}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="bg-indigo-100 rounded-full p-4 mb-4">
                <Camera className="w-12 h-12 text-indigo-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Enable Hand Gesture Control
              </h2>
              
              <p className="text-gray-600 mb-6">
                This website uses your camera to detect hand gestures for scrolling. 
                Your camera feed is processed locally and never recorded or transmitted.
              </p>
              
              <div className="bg-indigo-50 rounded-lg p-4 mb-6 w-full text-left">
                <p className="text-sm font-semibold text-indigo-900 mb-2">Gestures:</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-lg">☝️</span>
                    <span>Index finger up = Scroll up</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-lg">✊</span>
                    <span>Closed fist = Scroll down</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDeny}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Not Now
                </button>
                <button
                  onClick={handleAllow}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Allow Camera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission denied message */}
      {permissionDenied && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 rounded-full p-2">
              <Camera className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                Camera Access Required
              </p>
              <p className="text-xs text-gray-600 mb-2">
                Hand gesture control is disabled. Reload the page to enable it.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Reload Page
              </button>
            </div>
            <button
              onClick={() => setPermissionDenied(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Demo content */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Hand Gesture Scroll Demo
            </h1>
            <p className="text-gray-600 text-lg mb-6">
              Try using hand gestures to scroll this page! Raise your index finger to scroll up, 
              or make a fist to scroll down.
            </p>
            <div className="bg-indigo-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-indigo-900 mb-3">How it works:</h2>
              <ul className="space-y-2 text-gray-700">
                <li>• The component runs invisibly in the background</li>
                <li>• Your camera feed is processed locally on your device</li>
                <li>• Hand gestures are detected in real-time</li>
                <li>• No data is recorded or transmitted</li>
              </ul>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="space-y-6">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Section {i + 1}</h3>
                <p className="text-gray-600 leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute 
                  irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default HandGestureScroll2;