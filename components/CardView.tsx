
import React from 'react';
import { Card } from '../types';

interface CardViewProps {
  card: Card | null;
  isFlipped: boolean;
  isEditing?: boolean;
}

const CardView: React.FC<CardViewProps> = ({ card, isFlipped, isEditing }) => {
  if (isEditing && card) {
    return (
      <div className="w-full max-w-2xl h-96 bg-gray-800 rounded-lg shadow-lg flex flex-col justify-center p-6 border-2 border-dashed border-cyan-400 overflow-y-auto">
        <div className="mb-3">
          <p className="text-sm text-gray-400 mb-1">QUESTION</p>
          <p className="text-lg">{card.question}</p>
        </div>
        <div className="border-t border-gray-600 my-3"></div>
        <div className="mb-3">
          <p className="text-sm text-gray-400 mb-1">ANSWER</p>
          <p className="text-xl font-bold">{card.answer}</p>
        </div>
        {card.explanation && (
          <>
            <div className="border-t border-gray-600 my-3"></div>
            <div>
              <p className="text-sm text-gray-400 mb-1">EXPLANATION</p>
              <p className="text-md text-gray-300">{card.explanation}</p>
            </div>
          </>
        )}
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-2xl h-80 perspective-1000">
      <div className={`card w-full h-full ${isFlipped ? 'flipped' : ''}`}>
        {/* Front of Card */}
        <div className="card-face absolute w-full h-full bg-gray-800 rounded-lg shadow-lg flex items-center justify-center p-6">
          <div>
            <p className="text-sm text-gray-400 mb-2">QUESTION</p>
            <p className="text-2xl text-center">{card?.question ?? 'No card loaded.'}</p>
          </div>
        </div>
        {/* Back of Card */}
        <div className="card-back card-face absolute w-full h-full bg-blue-900 rounded-lg shadow-lg flex flex-col items-center justify-center p-6 overflow-y-auto">
           <div className="text-center">
            <p className="text-sm text-gray-300 mb-2">ANSWER</p>
            <p className="text-3xl font-bold">{card?.answer ?? ''}</p>
          </div>
          {card?.explanation && (
            <>
              <div className="border-t border-blue-700 my-4 w-1/2 mx-auto"></div>
              <p className="text-sm text-gray-200 text-center whitespace-pre-wrap">{card.explanation}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardView;