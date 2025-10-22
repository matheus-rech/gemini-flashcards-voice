
import React from 'react';
import { AudioPlaybackState } from '../types';

interface AudioControlsProps {
  playbackState: AudioPlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

// SVG Icons for buttons
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
  </svg>
);

const AudioControls: React.FC<AudioControlsProps> = ({ playbackState, onPlay, onPause, onStop }) => {
  const isPlaying = playbackState === AudioPlaybackState.PLAYING;
  const isPaused = playbackState === AudioPlaybackState.PAUSED;
  const isStopped = playbackState === AudioPlaybackState.STOPPED;

  return (
    <div className="flex items-center justify-center space-x-4 p-2 bg-gray-800/60 rounded-lg">
      <button
        onClick={onPlay}
        disabled={!isPaused}
        className="p-2 rounded-full text-gray-300 disabled:text-gray-600 enabled:hover:bg-gray-700 enabled:hover:text-white transition-colors"
        aria-label="Play audio"
      >
        <PlayIcon />
      </button>
      <button
        onClick={onPause}
        disabled={!isPlaying}
        className="p-2 rounded-full text-gray-300 disabled:text-gray-600 enabled:hover:bg-gray-700 enabled:hover:text-white transition-colors"
        aria-label="Pause audio"
      >
        <PauseIcon />
      </button>
      <button
        onClick={onStop}
        disabled={isStopped}
        className="p-2 rounded-full text-gray-300 disabled:text-gray-600 enabled:hover:bg-gray-700 enabled:hover:text-white transition-colors"
        aria-label="Stop audio"
      >
        <StopIcon />
      </button>
    </div>
  );
};

export default AudioControls;
