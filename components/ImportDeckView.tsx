
import React, { useState } from 'react';

interface ImportDeckViewProps {
  onImport: (deckName: string, csvContent: string) => void;
  onCancel: () => void;
}

const ImportDeckView: React.FC<ImportDeckViewProps> = ({ onImport, onCancel }) => {
  const [deckName, setDeckName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.type === 'text/plain' || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
          setFileName(file.name);
          setError('');
        };
        reader.readAsText(file);
      } else {
        setError('Please select a .csv or .txt file.');
        setFileName('');
        setFileContent('');
      }
    }
  };

  const handleSubmit = () => {
    if (!deckName.trim()) {
      setError('Please provide a name for the new deck.');
      return;
    }
    if (!fileContent) {
      setError('Please select a file to import.');
      return;
    }
    onImport(deckName, fileContent);
  };

  return (
    <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Import New Deck</h2>
      <p className="text-center text-gray-400 mb-6">
        Select a <code>.csv</code> or <code>.txt</code> file. Each line should contain a question, an answer, and an optional explanation, separated by a comma or semicolon.
      </p>

      <div className="space-y-4">
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="New Deck Name"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          aria-label="New deck name"
        />
        
        <label htmlFor="file-upload" className="w-full flex items-center justify-center px-4 py-6 bg-gray-700 text-gray-300 rounded-lg cursor-pointer hover:bg-gray-600 border-2 border-dashed border-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span>{fileName || 'Choose a file to upload...'}</span>
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>

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
          disabled={!deckName || !fileContent}
        >
          Import Deck
        </button>
      </div>
    </div>
  );
};

export default ImportDeckView;
