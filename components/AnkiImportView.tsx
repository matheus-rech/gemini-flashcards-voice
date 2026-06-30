
import React, { useState, useEffect } from 'react';

interface AnkiImportViewProps {
  isLoading: boolean;
  isAvailable: boolean | null;
  needsPermission: boolean;
  ankiDeckNames: string[];
  onRequestPermission: () => void;
  onImportDeck: (ankiDeckName: string, newLocalDeckName: string) => void;
  onCancel: () => void;
}

const AnkiImportView: React.FC<AnkiImportViewProps> = ({
  isLoading,
  isAvailable,
  needsPermission,
  ankiDeckNames,
  onRequestPermission,
  onImportDeck,
  onCancel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnkiDeck, setSelectedAnkiDeck] = useState<string | null>(null);
  const [localDeckName, setLocalDeckName] = useState('');

  const filteredDecks = ankiDeckNames.filter(name =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (selectedAnkiDeck) setLocalDeckName(selectedAnkiDeck);
  }, [selectedAnkiDeck]);

  const handleSubmit = () => {
    if (!selectedAnkiDeck || !localDeckName.trim()) return;
    onImportDeck(selectedAnkiDeck, localDeckName.trim());
  };

  if (isAvailable === false) {
    return (
      <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Anki Desktop Not Detected</h2>
        <p className="text-gray-400 mb-6">
          I couldn't reach Anki on this computer. Make sure Anki Desktop is running, the
          AnkiConnect add-on (code <code>2055492159</code>) is installed, and then try again.
          See <code>ANKI_SETUP.md</code> for full setup instructions.
        </p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRequestPermission}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500"
          >
            {isLoading ? 'Checking...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (isAvailable === true && needsPermission) {
    return (
      <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Permission Needed</h2>
        <p className="text-gray-400 mb-6">
          Anki needs your permission to connect. Look at Anki Desktop for an approval popup,
          click Yes/Allow, then click below.
        </p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRequestPermission}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500"
          >
            {isLoading ? 'Checking...' : "I've approved it"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Import from Anki</h2>
      <p className="text-center text-gray-400 mb-6">
        Pick a deck from your local Anki collection to import into EchoCards.
      </p>

      {isLoading ? (
        <p className="text-center text-gray-400">Loading your Anki decks...</p>
      ) : (
        <div className="space-y-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Anki decks..."
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Search for an Anki deck"
          />

          <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-2">
            {filteredDecks.length > 0 ? (
              filteredDecks.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedAnkiDeck(name)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    selectedAnkiDeck === name ? 'bg-cyan-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {name}
                </button>
              ))
            ) : (
              <p className="text-center text-gray-400 py-2">No matching Anki decks found.</p>
            )}
          </div>

          {selectedAnkiDeck && (
            <input
              type="text"
              value={localDeckName}
              onChange={(e) => setLocalDeckName(e.target.value)}
              placeholder="New deck name in EchoCards"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="EchoCards deck name"
            />
          )}
        </div>
      )}

      <div className="flex gap-4 mt-6">
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500"
          disabled={!selectedAnkiDeck || !localDeckName.trim() || isLoading}
        >
          Import Deck
        </button>
      </div>
    </div>
  );
};

export default AnkiImportView;
