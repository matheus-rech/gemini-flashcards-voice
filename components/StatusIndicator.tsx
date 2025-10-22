
import React from 'react';

interface StatusIndicatorProps {
  status: string;
  isAssistantSpeaking: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, isAssistantSpeaking }) => {
  return (
    <div className="w-full max-w-2xl p-4 bg-gray-800 rounded-lg flex items-center justify-center space-x-3">
      {isAssistantSpeaking && (
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
          </span>
          <span className="text-sky-400">Assistant is speaking...</span>
        </div>
      )}
      {!isAssistantSpeaking && (
         <span className="text-gray-300">{status}</span>
      )}
    </div>
  );
};

export default StatusIndicator;
