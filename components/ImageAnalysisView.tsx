
import React, { useState } from 'react';

interface ImageAnalysisViewProps {
  onAnalyze: (prompt: string) => void;
  onBack: () => void;
  isAnalyzing: boolean;
  analysisResult: string | null;
  image: {url: string, base64: string, mimeType: string} | null;
  setImage: (image: {url: string, base64: string, mimeType: string} | null) => void;
}

const ImageAnalysisView: React.FC<ImageAnalysisViewProps> = ({ onAnalyze, onBack, isAnalyzing, analysisResult, image, setImage }) => {
  const [prompt, setPrompt] = useState('What is in this image?');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const base64 = url.split(',')[1];
        setImage({ url, base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (prompt.trim() && image) {
      onAnalyze(prompt);
    }
  };

  return (
    <div className="w-full max-w-4xl p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">AI Image Analysis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Side: Upload & Prompt */}
        <div className="space-y-4">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">Upload an Image</label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700"
              disabled={isAnalyzing}
            />
          </div>
          {image && <img src={image.url} alt="Uploaded for analysis" className="w-full rounded-lg shadow-md" />}
          
          <div>
            <label htmlFor="analysis-prompt" className="block text-sm font-medium text-gray-300 mb-2">Your Question</label>
            <textarea
              id="analysis-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., What is in this image? or Explain this diagram."
              className="w-full h-24 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isAnalyzing}
            />
          </div>
        </div>

        {/* Right Side: Result */}
        <div className="space-y-4">
          <button
            onClick={handleSubmit}
            className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={isAnalyzing || !prompt.trim() || !image}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : 'Analyze Image'}
          </button>
          
          {analysisResult && (
            <div className="p-4 bg-gray-900/70 rounded-lg border border-gray-700 h-80 overflow-y-auto">
              <h3 className="text-lg font-semibold text-teal-300 mb-2">Analysis Result</h3>
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

export default ImageAnalysisView;
