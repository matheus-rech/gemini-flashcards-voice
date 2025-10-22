
import React from 'react';

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, id }) => {
  return (
    <label htmlFor={id} className="flex items-center cursor-pointer">
      <div
        className="relative"
        role="switch"
        aria-checked={checked}
      >
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
        <div
          className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
            checked ? 'transform translate-x-6 bg-cyan-400' : ''
          }`}
        ></div>
      </div>
      <div className="ml-3 text-gray-300 font-medium">{label}</div>
    </label>
  );
};

export default ToggleSwitch;
