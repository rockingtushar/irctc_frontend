import React from 'react';
import { Info } from 'lucide-react';

interface InformationMessagesProps {
  messages?: string[] | null;
}

export const InformationMessages: React.FC<InformationMessagesProps> = ({ messages }) => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  // Filter out empty strings
  const validMessages = messages.filter((m) => m && m.trim().length > 0);
  if (validMessages.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-blue-50/70 rounded-2xl border border-blue-200/80 p-4 sm:p-5 space-y-2.5">
      <div className="flex items-center gap-2 text-blue-800">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider">
          Important Information
        </h3>
      </div>

      <ul className="list-disc list-inside space-y-1.5 text-xs text-blue-900/90 pl-1">
        {validMessages.map((msg, index) => (
          <li key={index} className="leading-relaxed">
            {msg}
          </li>
        ))}
      </ul>
    </div>
  );
};
