import React from 'react';
import { PnrData } from '../../types/pnr';
import { PnrTrackVisualizerCard } from './PnrTrackVisualizerCard';

interface PnrResultProps {
  data: PnrData;
  onResetSearch: () => void;
}

export const PnrResult: React.FC<PnrResultProps> = ({ data, onResetSearch }) => {
  return (
    <div className="w-full animate-in fade-in duration-300">
      {/* Complete Unified PNR Journey, Passenger & Fare Track Visualizer */}
      <PnrTrackVisualizerCard data={data} onResetSearch={onResetSearch} />
    </div>
  );
};
