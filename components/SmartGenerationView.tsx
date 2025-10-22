import React, { useState } from 'react';

interface SmartGenerationViewProps {
  onGenerateFromForm: (topic: string, depth: string, numCards: number) => void;
  onGenerateFromDocument: (deckName: string, documentText: string) => void;
  onCancel: () => void;
}

type GenerationMode = 'form' | 'document';

// List of interesting topics for the demo feature
const demoTopics = [
  'The Italian Renaissance',
  'Basics of Quantum Computing',
  'The History of Jazz Music',
  'Neurotransmitters and their Functions',
  'The Silk Road',
  'Key Principles of Stoicism',
  'The process of Photosynthesis',
  'The Life Cycle of a Star'
];


const SmartGenerationView: React.FC<SmartGenerationViewProps> = ({ onGenerateFromForm, onGenerateFromDocument, onCancel }) => {
  const [mode, setMode] = useState<GenerationMode>('form');
  
  // Form state
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState('Intermediate');
  const [numCards, setNumCards] = useState(10);
  
  // Document state
  const [deckName, setDeckName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
          setFileName(file.name);
          setDeckName(file.name.replace(/\.txt$/i, '')); // Pre-fill deck name
          setError('');
        };
        reader.readAsText(file);
      } else {
        setError('Please select a .txt file.');
        setFileName('');
        setFileContent('');
      }
    }
  };
  
  const handleSubmit = () => {
    setError(''); // Clear previous messages
    if (mode === 'form') {
      if (!topic.trim()) {
        setError('Please provide a topic.');
        return;
      }
      onGenerateFromForm(topic, depth, numCards);
    } else { // document mode
      if (!deckName.trim()) {
        setError('Please provide a name for the new deck.');
        return;
      }
      if (!fileContent) {
        setError('Please select a text file to analyze.');
        return;
      }
      onGenerateFromDocument(deckName, fileContent);
    }
  };

  const handleRunDemo = () => {
    setMode('form'); // Ensure the UI is in the correct mode
    const randomTopic = demoTopics[Math.floor(Math.random() * demoTopics.length)];
    setTopic(randomTopic);
    setDepth('Intermediate');
    setNumCards(5);
    setError(`Demo topic loaded! Adjust settings and click "Generate Deck".`);
  };

  const isSubmitDisabled = mode === 'form' 
    ? !topic.trim()
    : !deckName.trim() || !fileContent;

  return (
    <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Smart Deck Generator</h2>
      
      {/* Mode Toggle */}
      <div className="flex justify-center mb-6 bg-gray-900/50 p-1 rounded-lg">
        <button
          onClick={() => setMode('form')}
          className={`w-1/2 py-2 rounded-md transition-colors ${mode === 'form' ? 'bg-cyan-600 font-semibold' : 'hover:bg-gray-700'}`}
        >
          From Topic
        </button>
        <button
          onClick={() => setMode('document')}
          className={`w-1/2 py-2 rounded-md transition-colors ${mode === 'document' ? 'bg-cyan-600 font-semibold' : 'hover:bg-gray-700'}`}
        >
          From Document
        </button>
      </div>

      <div className="space-y-4">
        {mode === 'form' ? (
          <>
            <p className="text-center text-gray-400">Generate a new deck by providing a topic and complexity.</p>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g., Photosynthesis)" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            <div className="flex gap-4">
              <select value={depth} onChange={(e) => setDepth(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Expert</option>
              </select>
              <input type="number" value={numCards} onChange={(e) => setNumCards(Math.max(1, parseInt(e.target.value, 10) || 1))} placeholder="Number of cards" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </>
        ) : (
           <>
            <p className="text-center text-gray-400">Upload a text file (.txt) with your notes or practice exam for analysis.</p>
            <input type="text" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="New Deck Name" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
             <label htmlFor="file-upload" className="w-full flex items-center justify-center px-4 py-6 bg-gray-700 text-gray-300 rounded-lg cursor-pointer hover:bg-gray-600 border-2 border-dashed border-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span>{fileName || 'Choose a .txt file...'}</span>
            </label>
            <input id="file-upload" type="file" accept=".txt,text/plain" onChange={handleFileChange} className="hidden" />
          </>
        )}
        {error && <p className="text-cyan-300 text-sm text-center">{error}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <button onClick={onCancel} className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors">Cancel</button>
        <button onClick={handleRunDemo} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors">Run Demo</button>
        <button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500">Generate Deck</button>
      </div>
    </div>
  );
};

export default SmartGenerationView;