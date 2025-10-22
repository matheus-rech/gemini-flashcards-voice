
import React from 'react';

interface TranscriptionViewProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  onBack: () => void;
  isRecording: boolean;
  isTranscribing: boolean;
  transcriptionResult: string | null;
}

const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  onStartRecording,
  onStopRecording,
  onBack,
  isRecording,
  isTranscribing,
  transcriptionResult,
}) => {
  return (
    <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Audio Transcription</h2>
      <p className="text-center text-gray-400 mb-6">
        Record your voice and get a text transcription powered by Gemini.
      </p>

      <div className="flex justify-center items-center my-6">
        {!isRecording ? (
          <button
            onClick={onStartRecording}
            disabled={isTranscribing}
            className="w-24 h-24 bg-red-600 hover:bg-red-700 rounded-full font-semibold transition-colors text-white flex items-center justify-center text-sm disabled:bg-gray-500"
          >
            Record
          </button>
        ) : (
          <button
            onClick={onStopRecording}
            className="w-24 h-24 bg-gray-600 hover:bg-gray-700 rounded-full font-semibold transition-colors text-white flex items-center justify-center text-sm"
          >
            Stop
          </button>
        )}
      </div>
      
      {isRecording && (
         <div className="flex items-center justify-center space-x-2 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-red-400">Recording...</span>
        </div>
      )}


      <div className="min-h-[10rem] p-4 bg-gray-900/70 rounded-lg border border-gray-700">
        {isTranscribing ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <svg className="animate-spin h-8 w-8 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Transcribing...</span>
          </div>
        ) : (
          <p className="text-gray-300 whitespace-pre-wrap">
            {transcriptionResult || 'Your transcribed text will appear here.'}
          </p>
        )}
      </div>

      <button onClick={onBack} className="w-full mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors">
        Go Back
      </button>
    </div>
  );
};

export default TranscriptionView;
