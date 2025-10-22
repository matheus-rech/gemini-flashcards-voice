

import React, { useState } from 'react';
import { Deck } from '../types';

interface DeckListViewProps {
  decks: Deck[];
  onStartReview: (deckName: string) => void;
  onShowImport: () => void;
  onShowSmartGeneration: () => void;
  onStrengthenWeakness: (deckName: string) => void;
  onShowImageGeneration: () => void;
  onShowImageAnalysis: () => void;
  onShowTranscription: () => void;
  onShowTextAnalysis: () => void;
}

const DeckListView: React.FC<DeckListViewProps> = ({ decks, onStartReview, onShowImport, onShowSmartGeneration, onStrengthenWeakness, onShowImageGeneration, onShowImageAnalysis, onShowTranscription, onShowTextAnalysis }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDecks = decks.filter(deck =>
    deck.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl p-4">
      <h2 className="text-2xl font-bold text-center mb-4">Your Decks</h2>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search decks..."
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          aria-label="Search for a deck"
        />
         <div className="flex gap-2 flex-wrap justify-center">
            <button 
              onClick={onShowImageGeneration}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Generate Image
            </button>
            <button 
              onClick={onShowImageAnalysis}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Analyze Image
            </button>
             <button 
              onClick={onShowTextAnalysis}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Analyze Text
            </button>
             <button 
              onClick={onShowTranscription}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Transcribe Audio
            </button>
            <button 
              onClick={onShowImport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Import Deck
            </button>
            <button 
              onClick={onShowSmartGeneration}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Smart Create Deck
            </button>
        </div>
      </div>

      {filteredDecks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => (
            <div key={deck.id} className="bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col justify-between transition-transform hover:scale-105">
              <h3 className="text-xl font-semibold mb-4 text-center">{deck.name}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => onStartReview(deck.name)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                >
                  Start Review
                </button>
                <button
                  onClick={() => onStrengthenWeakness(deck.name)}
                  className="w-full px-4 py-2 bg-cyan-700 hover:bg-cyan-800 rounded-lg font-semibold text-sm transition-colors"
                >
                  Strengthen Weak Points
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400">
          {searchQuery ? 'No decks match your search.' : "You haven't created any decks yet."}
        </p>
      )}
    </div>
  );
};

export default DeckListView;