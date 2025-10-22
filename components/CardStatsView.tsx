import React from 'react';
import { Card } from '../types';

interface CardStatsViewProps {
  card: Card | null;
  onBack: () => void;
  explanation: string | null;
  isGenerating: boolean;
  onGenerateExplanation: () => void;
}

const StatItem: React.FC<{ label: string; value: string | number | Date }> = ({ label, value }) => (
  <div className="bg-gray-800/50 p-3 rounded-lg">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-lg font-semibold">
      {value instanceof Date ? value.toLocaleDateString() : value.toString()}
    </p>
  </div>
);

const CardStatsView: React.FC<CardStatsViewProps> = ({ card, onBack, explanation, isGenerating, onGenerateExplanation }) => {
  if (!card) {
    return (
      <div className="w-full max-w-2xl text-center">
        <p>No card selected to view stats.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  const effectiveExplanation = explanation || card.explanation;

  return (
    <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">Card Statistics</h2>
      
      <div className="mb-6 p-4 border border-gray-600 rounded-lg">
         <p className="text-sm text-gray-400 mb-1">QUESTION</p>
         <p className="text-xl mb-3">{card.question}</p>
         <div className="border-t border-gray-700 my-2"></div>
         <p className="text-sm text-gray-400 mb-1">ANSWER</p>
         <p className="text-xl font-bold">{card.answer}</p>
         {card.explanation && (
          <>
            <div className="border-t border-gray-700 my-2"></div>
            <p className="text-sm text-gray-400 mb-1">EXPLANATION</p>
            <p className="text-md text-gray-300">{card.explanation}</p>
          </>
         )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatItem label="State" value={card.state} />
        <StatItem label="Due Date" value={card.dueDate} />
        <StatItem label="Stability" value={card.stability.toFixed(2)} />
        <StatItem label="Difficulty" value={card.difficulty.toFixed(2)} />
        <StatItem label="Repetitions" value={card.reps} />
        <StatItem label="Lapses" value={card.lapses} />
      </div>

      <div className="mt-6">
        <button 
            onClick={onGenerateExplanation}
            disabled={isGenerating}
            className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
        >
            {isGenerating ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                </>
            ) : "Explain with AI"}
        </button>
        {effectiveExplanation && !isGenerating && (
            <div className="mt-4 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">AI Explanation</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{effectiveExplanation}</p>
            </div>
        )}
      </div>

      <button onClick={onBack} className="w-full mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors">
        Go Back
      </button>
    </div>
  );
};

export default CardStatsView;