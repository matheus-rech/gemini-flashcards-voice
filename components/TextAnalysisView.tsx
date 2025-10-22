import React, { useState } from 'react';

interface TextAnalysisViewProps {
  onAnalyze: (text: string, prompt: string, complexity: 'simple' | 'complex') => void;
  onBack: () => void;
  isAnalyzing: boolean;
  analysisResult: string | null;
}

const TextAnalysisView: React.FC<TextAnalysisViewProps> = ({ onAnalyze, onBack, isAnalyzing, analysisResult }) => {
  const [textToAnalyze, setTextToAnalyze] = useState('');
  const [prompt, setPrompt] = useState('Summarize this text in three key points.');
  const [complexity, setComplexity] = useState<'simple' | 'complex'>('simple');

  const handleSubmit = () => {
    if (prompt.trim() && textToAnalyze.trim()) {
      onAnalyze(textToAnalyze, prompt, complexity);
    }
  };

  return (
    <div className="w-full max-w-4xl p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">AI Text Analysis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Side: Input */}
        <div className="space-y-4">
          <div>
            <label htmlFor="text-to-analyze" className="block text-sm font-medium text-gray-300 mb-2">Text to Analyze</label>
            <textarea
              id="text-to-analyze"
              value={textToAnalyze}
              onChange={(e) => setTextToAnalyze(e.target.value)}
              placeholder="Paste or type the text you want to analyze here..."
              className="w-full h-48 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isAnalyzing}
            />
          </div>
          
          <div>
            <label htmlFor="analysis-prompt" className="block text-sm font-medium text-gray-300 mb-2">Your Question / Prompt</label>
            <textarea
              id="analysis-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Summarize this text, or What is the main argument?"
              className="w-full h-24 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isAnalyzing}
            />
          </div>
        </div>

        {/* Right Side: Config & Result */}
        <div className="space-y-4">
          <div>
             <label className="block text-sm font-medium text-gray-300 mb-2">Analysis Complexity</label>
             <div className="flex justify-center bg-gray-900/50 p-1 rounded-lg">
                <button
                  onClick={() => setComplexity('simple')}
                  className={`w-1/2 py-2 rounded-md transition-colors ${complexity === 'simple' ? 'bg-cyan-600 font-semibold' : 'hover:bg-gray-700'}`}
                  disabled={isAnalyzing}
                >
                  Fast (Flash)
                </button>
                <button
                  onClick={() => setComplexity('complex')}
                  className={`w-1/2 py-2 rounded-md transition-colors ${complexity === 'complex' ? 'bg-cyan-600 font-semibold' : 'hover:bg-gray-700'}`}
                  disabled={isAnalyzing}
                >
                  Complex (Pro)
                </button>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={isAnalyzing || !prompt.trim() || !textToAnalyze.trim()}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : 'Analyze Text'}
          </button>
          
          {analysisResult && (
            <div className="p-4 bg-gray-900/70 rounded-lg border border-gray-700 h-60 overflow-y-auto">
              <h3 className="text-lg font-semibold text-yellow-300 mb-2">Analysis Result</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{analysisResult}</p>
            </div>
          )}
        </div>
      </div>

      <button onClick={onBack} className="w-full mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors">
        Go Back
      </button>
    </div>
  );
};

export default TextAnalysisView;