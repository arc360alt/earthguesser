import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StreetView from '../components/StreetView';
import GuessMap from '../components/GuessMap';
import Timer from '../components/Timer';
import AchievementToast from '../components/AchievementToast';
import { useTimer } from '../hooks/useTimer';
import { getDuelSocket, disconnectDuelSocket } from '../utils/socket';
import { formatDistance, scoreColor } from '../utils/geo';
import { useAuth } from '../hooks/useAuth';
import useSettingsStore from '../store/settingsStore';

const ROUND_RESULT_DISPLAY_MS = 5000;

export default function Duel() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { units } = useSettingsStore();

  const [phase, setPhase] = useState('idle'); // idle | queueing | playing | over
  const [error, setError] = useState(null);
  const [duelId, setDuelId] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [roundCount, setRoundCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState(90);
  const [currentRound, setCurrentRound] = useState(null);
  const [guess, setGuess] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [opponentStatus, setOpponentStatus] = useState('thinking');
  const [roundResult, setRoundResult] = useState(null);
  const [yourTotal, setYourTotal] = useState(0);
  const [opponentTotal, setOpponentTotal] = useState(0);
  const [finalResult, setFinalResult] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);

  const socketRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const roundResultTimeoutRef = useRef(null);

  const handleTimeUp = useCallback(() => {
    if (!submitted) submitGuess();
  }, [submitted, guess]);

  const { timeLeft, start: startTimer, stop: stopTimer, reset: resetTimer, initialSeconds } = useTimer(
    timeLimit,
    handleTimeUp
  );

  useEffect(() => {
    const socket = getDuelSocket();
    socketRef.current = socket;
    socket.connect();

    socket.on('connect_error', () => setError('Could not connect. Please log in again.'));

    socket.on('duel:start', (data) => {
      setError(null);
      setDuelId(data.duelId);
      setOpponent(data.opponent);
      setRoundCount(data.roundCount);
      setTimeLimit(data.timeLimit);
      setCurrentRound(data.round);
      setYourTotal(0);
      setOpponentTotal(0);
      setOpponentStatus('thinking');
      setSubmitted(false);
      setGuess(null);
      setPhase('playing');
    });

    socket.on('duel:opponent-status', (d) => setOpponentStatus(d.status));

    socket.on('duel:round-result', (data) => {
      setRoundResult(data);
      setYourTotal(data.yourTotal);
      setOpponentTotal(data.opponentTotal);
      stopTimer();
      clearTimeout(roundResultTimeoutRef.current);
      roundResultTimeoutRef.current = setTimeout(() => setRoundResult(null), ROUND_RESULT_DISPLAY_MS);
    });

    socket.on('duel:next-round', (data) => {
      setCurrentRound(data.round);
      setGuess(null);
      setSubmitted(false);
      setOpponentStatus('thinking');
      startTimeRef.current = Date.now();
      resetTimer(timeLimit);
      startTimer();
    });

    socket.on('duel:duel-over', (data) => {
      clearTimeout(roundResultTimeoutRef.current);
      setFinalResult(data);
      setNewAchievements(data.newAchievements || []);
      setPhase('over');
      refreshUser();
    });

    socket.on('duel:opponent-left', (data) => {
      clearTimeout(roundResultTimeoutRef.current);
      setFinalResult({ result: 'win', yourScore: data.yourScore, opponentScore: null, opponentLeft: true, newAchievements: data.newAchievements });
      setNewAchievements(data.newAchievements || []);
      setPhase('over');
      refreshUser();
    });

    socket.on('duel:error', (d) => setError(d.error));

    return () => {
      clearTimeout(roundResultTimeoutRef.current);
      socket.off('connect_error');
      socket.off('duel:start');
      socket.off('duel:opponent-status');
      socket.off('duel:round-result');
      socket.off('duel:next-round');
      socket.off('duel:duel-over');
      socket.off('duel:opponent-left');
      socket.off('duel:error');
      disconnectDuelSocket();
    };
  }, []);

  // Kick off the round timer 2s after the first round of a duel starts
  useEffect(() => {
    if (phase !== 'playing' || currentRound?.roundNumber !== 1) return;
    const t = setTimeout(() => {
      startTimeRef.current = Date.now();
      resetTimer(timeLimit);
      startTimer();
    }, 2000);
    return () => clearTimeout(t);
  }, [phase, currentRound?.roundNumber]);

  function findOpponent() {
    setError(null);
    setPhase('queueing');
    socketRef.current?.emit('duel:queue');
  }

  function cancelQueue() {
    socketRef.current?.emit('duel:cancel-queue');
    setPhase('idle');
  }

  function submitGuess() {
    if (submitted || !currentRound) return;
    setSubmitted(true);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const payload = guess || { lat: 0, lng: 0 };
    socketRef.current?.emit('duel:guess', {
      duelId,
      roundNumber: currentRound.roundNumber,
      lat: payload.lat,
      lng: payload.lng,
      timeTaken,
    });
  }

  function playAgain() {
    setPhase('idle');
    setFinalResult(null);
    setRoundResult(null);
    setDuelId(null);
  }

  // ── idle
  if (phase === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">⚔️</div>
          <h1 className="text-3xl font-bold mb-2">Duel</h1>
          <p className="text-white/50 text-sm mb-6">
            Head-to-head, 5 rounds, worldwide. Same locations, whoever scores more wins.
          </p>
          {error && (
            <div className="mb-4 bg-brand-accent/20 border border-brand-accent/40 text-brand-accent text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <button onClick={findOpponent} className="btn-primary w-full text-lg py-3">
            Find Opponent →
          </button>
        </div>
      </div>
    );
  }

  // ── queueing
  if (phase === 'queueing') {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4 animate-bounce">🔍</div>
          <h2 className="text-2xl font-bold mb-2">Finding an opponent…</h2>
          <p className="text-white/50 text-sm mb-6">Hang tight, this can take a moment.</p>
          <button onClick={cancelQueue} className="btn-secondary w-full">Cancel</button>
        </div>
      </div>
    );
  }

  // ── over
  if (phase === 'over' && finalResult) {
    const { result, yourScore, opponentScore, opponentLeft } = finalResult;
    const label = result === 'win' ? 'You Won! 🎉' : result === 'loss' ? 'You Lost' : "It's a Draw";
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <AchievementToast achievements={newAchievements} />
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-3">{result === 'win' ? '🏆' : result === 'loss' ? '💔' : '🤝'}</div>
          <h1 className="text-3xl font-bold mb-2">{label}</h1>
          {opponentLeft && <p className="text-white/50 text-sm mb-4">Your opponent disconnected.</p>}

          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-white/50 text-xs">You</p>
              <p className="text-2xl font-bold text-brand-green">{yourScore.toLocaleString()}</p>
            </div>
            <span className="text-white/30">vs</span>
            <div className="text-right">
              <p className="text-white/50 text-xs">{opponent}</p>
              <p className="text-2xl font-bold">{opponentScore != null ? opponentScore.toLocaleString() : '—'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/')} className="btn-secondary flex-1">Home</button>
            <button onClick={playAgain} className="btn-primary flex-1">Duel Again →</button>
          </div>
        </div>
      </div>
    );
  }

  // ── playing
  if (!currentRound) return null;

  return (
    <div className="flex-1 flex flex-col relative" style={{ height: 'calc(100vh - 57px)' }}>
      <div className="absolute inset-0">
        <StreetView key={`duel-round-${currentRound.roundNumber}`} lat={currentRound.lat} lng={currentRound.lng} panoId={currentRound.panoId} />
      </div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
        <div className="bg-brand-panel/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-white font-semibold">Round {currentRound.roundNumber}</span>
          <span className="text-white/50"> / {roundCount}</span>
        </div>

        <div className="bg-brand-panel/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
          <Timer timeLeft={timeLeft} totalTime={initialSeconds} />
        </div>

        <div className="bg-brand-panel/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
          <span className="text-white font-semibold">{yourTotal.toLocaleString()}</span>
          <span className="text-white/30">vs</span>
          <span className="text-white/70">{opponentTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Opponent status */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <span className={`text-xs px-3 py-1.5 rounded-full border backdrop-blur-sm ${
          opponentStatus === 'guessed'
            ? 'bg-brand-green/10 border-brand-green/30 text-brand-green'
            : 'bg-brand-panel/90 border-white/10 text-white/50'
        }`}>
          {opponent} {opponentStatus === 'guessed' ? 'has guessed ✓' : 'is thinking…'}
        </span>
      </div>

      {/* Minimap + button wrapper */}
      <div className="absolute" style={{ bottom: '16px', right: '16px', zIndex: 20 }}>
        <div className="w-[260px] h-[200px] hover:w-[480px] hover:h-[380px] transition-all duration-200">
          <div className="relative w-full h-full">
            <GuessMap
              onGuessChange={setGuess}
              disabled={submitted}
              guessLat={guess?.lat}
              guessLng={guess?.lng}
            />
            {guess && !submitted && (
              <button onClick={submitGuess} className="btn-primary absolute bottom-2 left-2 right-2">
                Guess
              </button>
            )}
            {submitted && (
              <div className="absolute bottom-2 left-2 right-2 bg-brand-panel/90 border border-white/10 rounded-lg py-2 text-center text-sm text-white/60">
                Waiting for {opponent}…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Round result overlay */}
      {roundResult && (
        <div className="fixed inset-0 z-50 flex flex-col bg-brand-dark">
          <div className="flex-1 relative">
            <GuessMap
              showResult
              actualLat={roundResult.actualLat}
              actualLng={roundResult.actualLng}
              guessLat={roundResult.you.guessLat}
              guessLng={roundResult.you.guessLng}
              opponentGuess={{ lat: roundResult.opponent.guessLat, lng: roundResult.opponent.guessLng }}
              disabled
              fullscreen
            />
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
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#7c3aed' }}></span>
                <span>{opponent}'s guess</span>
              </div>
            </div>
          </div>

          <div className="bg-brand-panel border-t border-white/10 px-6 py-5 z-50 relative">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-0.5">You</p>
                <p className="text-2xl font-bold" style={{ color: scoreColor(roundResult.you.score) }}>
                  {roundResult.you.score.toLocaleString()} pts
                </p>
                <p className="text-white/70 text-sm mt-0.5">
                  {roundResult.you.distanceKm != null ? formatDistance(roundResult.you.distanceKm, units) + ' away' : 'No guess'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/50 mb-0.5">{opponent}</p>
                <p className="text-2xl font-bold" style={{ color: scoreColor(roundResult.opponent.score) }}>
                  {roundResult.opponent.score.toLocaleString()} pts
                </p>
                <p className="text-white/70 text-sm mt-0.5">
                  {roundResult.opponent.distanceKm != null ? formatDistance(roundResult.opponent.distanceKm, units) + ' away' : 'No guess'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
