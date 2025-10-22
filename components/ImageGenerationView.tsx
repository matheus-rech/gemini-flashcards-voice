
import React, { useState } from 'react';

interface ImageGenerationViewProps {
  onGenerate: (prompt: string) => void;
  onBack: () => void;
  isGenerating: boolean;
  imageUrl: string | null;
}

const ImageGenerationView: React.FC<ImageGenerationViewProps> = ({ onGenerate, onBack, isGenerating, imageUrl }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">AI Image Generation</h2>
      <p className="text-center text-gray-400 mb-6">
        Describe the image you want to create. Be as specific as possible for the best results.
      </p>

      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A photorealistic image of a red panda wearing a tiny astronaut helmet, floating in space"
          className="w-full h-24 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          aria-label="Image generation prompt"
          disabled={isGenerating}
        />
        <button
          onClick={handleSubmit}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : 'Generate Image'}
        </button>
      </div>

      {imageUrl && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-center mb-2">Generated Image</h3>
          <img src={imageUrl} alt={prompt} className="w-full max-w-md mx-auto rounded-lg shadow-lg" />
        </div>
      )}

      <button onClick={onBack} className="w-full mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-colors">
        Go Back
      </button>
    </div>
  );
};

export default ImageGenerationView;
