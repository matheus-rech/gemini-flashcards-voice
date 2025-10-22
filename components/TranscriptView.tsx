
import React, { useRef, useEffect } from 'react';
import { TranscriptMessage } from '../types';

interface TranscriptViewProps {
  messages: TranscriptMessage[];
}

const TranscriptView: React.FC<TranscriptViewProps> = ({ messages }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="w-full max-w-2xl h-48 bg-gray-950/50 rounded-lg p-4 overflow-y-auto space-y-4">
      {messages.map((msg, index) => (
        <div key={index} className={`flex ${msg.source === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`px-4 py-2 rounded-lg max-w-sm ${msg.source === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default TranscriptView;
