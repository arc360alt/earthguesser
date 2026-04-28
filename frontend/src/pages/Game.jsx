import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import StreetView from '../components/StreetView';
import GuessMap from '../components/GuessMap';
import Timer from '../components/Timer';
import RoundResult from '../components/RoundResult';
import { useTimer } from '../hooks/useTimer';
import api from '../utils/api';

export default function Game() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [gameData, setGameData] = useState(location.state?.gameData || null);
  const [loading, setLoading] = useState(!location.state?.gameData);
  const [guess, setGuess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(null);
  const startTimeRef = useRef(Date.now());
  const initDone = useRef(false);

  const timeLimit = gameData?.timeLimit;
  const hasTimer = gameData?.mode !== 'notime' && timeLimit != null;

  const handleTimeUp = useCallback(() => {
    if (!result && !submitting) submitGuess(true);
  }, [result, submitting]);

  const { timeLeft, start: startTimer, stop: stopTimer, reset: resetTimer, initialSeconds } = useTimer(
    timeLimit || 120,
    handleTimeUp
  );

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    // Case 1: We have gameData from location.state (navigated from GameSetup)
    if (location.state?.gameData?.currentRound) {
      const cr = location.state.gameData.currentRound;
      setCurrentRound({ roundNumber: cr.roundNumber, lat: cr.lat, lng: cr.lng, panoId: cr.panoId });
      setLoading(false);
      return;
    }

    // Case 2: No gameData, need to fetch from API
    api.get(`/game/${gameId}`).then((r) => {
      const { game, rounds } = r.data;
      const nextRoundNum = game.current_round + 1;
      const round = rounds.find((r) => r.round_number === nextRoundNum);
      if (!round) return navigate('/');
      const newGameData = {
        gameId: game.id,
        totalRounds: game.round_count,
        timeLimit: game.mode !== 'notime' ? game.time_limit : null,
        mode: game.mode,
        region: game.region,
        activeBonus: game.active_bonus,
        continentHint: game.currentRound?.continentHint,
      };
      setGameData(newGameData);
      setCurrentRound({ roundNumber: nextRoundNum, lat: round.actual_lat, lng: round.actual_lng, panoId: round.actual_pano_id });
      setTotalScore(game.total_score);
      setLoading(false);
    }).catch(() => navigate('/'));
  }, []);

  useEffect(() => {
    if (!currentRound || !hasTimer) return;
    resetTimer(timeLimit);
    startTimer();
    startTimeRef.current = Date.now();
    return () => stopTimer();
  }, [currentRound?.roundNumber]);

  async function submitGuess(timedOut = false) {
    if (submitting) return;
    setSubmitting(true);
    stopTimer();

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const guessPayload = timedOut || !guess
      ? { lat: 0, lng: 0 }
      : guess;

    try {
      const res = await api.post(`/game/${gameId}/guess`, {
        guessLat: guessPayload.lat,
        guessLng: guessPayload.lng,
        timeTaken,
      });

      setResult({
        score: res.data.score,
        distanceKm: res.data.distanceKm,
        actualLat: res.data.actualLat,
        actualLng: res.data.actualLng,
        guessLat: timedOut ? null : guessPayload.lat,
        guessLng: timedOut ? null : guessPayload.lng,
        roundNumber: res.data.roundNumber,
        isLastRound: res.data.isLastRound,
        nextRound: res.data.nextRound,
      });
      setTotalScore(res.data.totalScore);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinue() {
    if (!result || result.isLastRound) {
      await api.post(`/game/${gameId}/finish`);
      navigate(`/result/${gameId}`);
      return;
    }
    if (!result.nextRound) {
      console.error('No nextRound data! result:', result);
      return;
    }

    const newRound = {
      roundNumber: result.nextRound.roundNumber,
      lat: result.nextRound.lat,
      lng: result.nextRound.lng,
      panoId: result.nextRound.panoId,
    };

    console.log('[DEBUG] Advancing to round:', newRound.roundNumber, 'from round:', currentRound?.roundNumber);

    setResult(null);
    setGuess(null);
    setCurrentRound(newRound);
    setGameData((prev) => ({
      ...prev,
      continentHint: result.nextRound.continent,
    }));
  }

  if (loading || !currentRound) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🌍</div>
          <p className="text-white/60">Loading location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative" style={{ height: 'calc(100vh - 57px)' }}>
      {/* Street View - full screen */}
      <div className="absolute inset-0">
        <StreetView
          key={`round-${currentRound.roundNumber}`}
          lat={currentRound.lat}
          lng={currentRound.lng}
          noPan={gameData?.mode === 'nopan'}
          panoId={currentRound.panoId}
        />
      </div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
        <div className="bg-brand-panel/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-white font-semibold">Round {currentRound.roundNumber}</span>
          <span className="text-white/50"> / {gameData?.totalRounds}</span>
          {gameData?.continentHint && (
            <span className="ml-2 text-brand-green text-sm">🌍 {gameData.continentHint}</span>
          )}
        </div>

        {hasTimer && (
          <div className="bg-brand-panel/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
            <Timer timeLeft={timeLeft} totalTime={initialSeconds} />
          </div>
        )}

        <div className="bg-brand-panel/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
          <span className="text-white font-semibold">{totalScore.toLocaleString()}</span>
          <span className="text-white/50"> pts</span>
        </div>
      </div>

      {/* Minimap + button wrapper */}
      <div className="absolute" style={{ bottom: '16px', right: '16px', zIndex: 20 }}>
        <div className="w-[260px] h-[200px] hover:w-[480px] hover:h-[380px] transition-all duration-200">
          <div className="relative w-full h-full">
            <GuessMap
              onGuessChange={setGuess}
              disabled={submitting}
              guessLat={guess?.lat}
              guessLng={guess?.lng}
            />
            {guess && (
              <button
                onClick={() => submitGuess(false)}
                disabled={submitting}
                className="btn-primary absolute bottom-2 left-2 right-2"
              >
                {submitting ? '...' : 'Guess'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Result overlay */}
      {result && (
        <RoundResult
          score={result.score}
          distanceKm={result.distanceKm}
          actualLat={result.actualLat}
          actualLng={result.actualLng}
          guessLat={result.guessLat}
          guessLng={result.guessLng}
          roundNumber={result.roundNumber}
          totalRounds={gameData?.totalRounds}
          totalScore={totalScore}
          isLastRound={result.isLastRound}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}
