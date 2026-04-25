import React from 'react';
import GuessMap from './GuessMap';
import ScoreBar from './ScoreBar';
import { formatDistance, scoreColor } from '../utils/geo';

export default function RoundResult({
  score,
  distanceKm,
  actualLat,
  actualLng,
  guessLat,
  guessLng,
  roundNumber,
  totalRounds,
  totalScore,
  isLastRound,
  onContinue,
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-dark">
      {/* Full-screen result map */}
      <div className="flex-1 relative">
        <GuessMap
          showResult
          actualLat={actualLat}
          actualLng={actualLng}
          guessLat={guessLat}
          guessLng={guessLng}
          disabled
          fullscreen
        />

        {/* Legend */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 text-xs font-medium bg-brand-panel/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 z-50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brand-green inline-block"></span>
            <span>Actual location</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brand-accent inline-block"></span>
            <span>Your guess</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 border-t-2 border-dashed border-yellow-400 inline-block"></span>
            <span>Distance</span>
          </div>
        </div>
      </div>

      {/* Result panel */}
      <div className="bg-brand-panel border-t border-white/10 px-6 py-5 z-50 relative">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-white/50 mb-0.5">Round {roundNumber} of {totalRounds}</p>
              <h2 className="text-2xl font-bold" style={{ color: scoreColor(score) }}>
                {score.toLocaleString()} points
              </h2>
              <p className="text-white/70 text-sm mt-0.5">
                You were <span className="text-white font-semibold">{formatDistance(distanceKm)}</span> away
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/50">Total score</p>
              <p className="text-2xl font-bold text-brand-green">{totalScore.toLocaleString()}</p>
            </div>
          </div>

          <ScoreBar score={score} />

          <button
            onClick={onContinue}
            className="btn-primary w-full mt-4 text-base py-3"
          >
            {isLastRound ? 'See Final Results →' : 'Next Round →'}
          </button>
        </div>
      </div>
    </div>
  );
}
