import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StreetView from '../components/StreetView';
import GuessMap from '../components/GuessMap';
import Timer from '../components/Timer';
import RoundResult from '../components/RoundResult';
import { useTimer } from '../hooks/useTimer';
import { calculateScore, haversineDistance } from '../utils/geo';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const DAILY_ROUNDS = 5;
const DAILY_TIME = 120;

export default function DailyChallenge() {
  const navigate = useNavigate();
  const { isLoggedIn, refreshUser } = useAuth();

  const [phase, setPhase] = useState('loading'); // loading | info | playing | result
  const [dailyInfo, setDailyInfo] = useState(null);
  const [locations, setLocations] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [allGuesses, setAllGuesses] = useState([]);
  const [guess, setGuess] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const startTimeRef = useRef(Date.now());

  const handleTimeUp = useCallback(() => {
    if (!roundResult) submitGuess(true);
  }, [roundResult]);

  const { timeLeft, start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer(
    DAILY_TIME,
    handleTimeUp
  );

  useEffect(() => {
    api.get('/daily')
      .then((r) => {
        setDailyInfo(r.data);
        setPhase('info');
      })
      .catch(() => setPhase('info'));
  }, []);

  async function startDaily() {
    try {
      const res = await api.post('/daily/start');
      setLocations(res.data.locations);
      setPhase('playing');
    } catch (err) {
      if (err.response?.status === 409) {
        setPhase('already_done');
      } else {
        alert(err.response?.data?.error || 'Failed to start challenge');
      }
    }
  }

  useEffect(() => {
    if (phase !== 'playing' || !locations.length) return;
    resetTimer(DAILY_TIME);
    startTimer();
    startTimeRef.current = Date.now();
    return () => stopTimer();
  }, [roundIndex, phase]);

  function submitGuess(timedOut = false) {
    stopTimer();
    const loc = locations[roundIndex];
    const guessPos = timedOut || !guess ? { lat: 0, lng: 0 } : guess;
    const distanceKm = haversineDistance(loc.lat, loc.lng, guessPos.lat, guessPos.lng);
    const score = timedOut && !guess ? 0 : calculateScore(distanceKm);
    const newTotal = totalScore + score;

    const thisGuess = { lat: guessPos.lat, lng: guessPos.lng };
    const newGuesses = [...allGuesses, thisGuess];

    setAllGuesses(newGuesses);
    setTotalScore(newTotal);
    setRoundResult({
      score,
      distanceKm: Math.round(distanceKm),
      actualLat: loc.lat,
      actualLng: loc.lng,
      guessLat: timedOut && !guess ? null : guessPos.lat,
      guessLng: timedOut && !guess ? null : guessPos.lng,
      roundNumber: roundIndex + 1,
      isLastRound: roundIndex === DAILY_ROUNDS - 1,
      nextRound: roundIndex < DAILY_ROUNDS - 1 ? { roundNumber: roundIndex + 2 } : null,
      totalScore: newTotal,
      guessesSnapshot: newGuesses,
    });
  }

  async function handleContinue() {
    if (roundResult.isLastRound) {
      // Submit all guesses to backend
      try {
        const res = await api.post('/daily/submit', {
          guesses: roundResult.guessesSnapshot,
        });
        setFinalResult(res.data);
        setPhase('result');
        if (isLoggedIn) refreshUser();
      } catch (err) {
        // Even if submission fails (e.g. not logged in), show local result
        setFinalResult({
          totalScore,
          maxScore: DAILY_ROUNDS * 5000,
          roundScores: [],
          earnedPoints: 0,
          dailyStreak: null,
        });
        setPhase('result');
      }
      return;
    }
    setRoundResult(null);
    setGuess(null);
    setMapExpanded(false);
    setRoundIndex((i) => i + 1);
  }

  // ── Phase: loading
  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl animate-bounce">📅</div>
      </div>
    );
  }

  // ── Phase: already done
  if (phase === 'already_done') {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center card max-w-sm w-full">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Already completed!</h2>
          <p className="text-white/50 text-sm mb-6">You've already done today's challenge. Come back tomorrow!</p>
          <button onClick={() => navigate('/play')} className="btn-primary w-full">Play Quick Game</button>
        </div>
      </div>
    );
  }

  // ── Phase: final result
  if (phase === 'result' && finalResult) {
    const pct = Math.round((finalResult.totalScore / finalResult.maxScore) * 100);
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🌍</div>
            <h1 className="text-3xl font-bold">Daily Challenge</h1>
            <p className="text-white/50 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="card mb-4 text-center">
            <p className="text-white/50 text-sm mb-1">Total Score</p>
            <p className="text-5xl font-bold text-brand-green">{finalResult.totalScore.toLocaleString()}</p>
            <p className="text-white/40 text-sm">out of {finalResult.maxScore.toLocaleString()}</p>
            <div className="mt-4 h-3 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-brand-green rounded-full score-fill" style={{ width: `${pct}%` }} />
            </div>

            {finalResult.dailyStreak != null && (
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
                <span className="text-2xl">🔥</span>
                <span className="font-bold text-lg">{finalResult.dailyStreak} day streak!</span>
              </div>
            )}

            {!isLoggedIn && (
              <p className="text-white/40 text-xs mt-3">
                <a href="/register" className="text-brand-green hover:underline">Create an account</a> to save your streak and score.
              </p>
            )}
          </div>

          {finalResult.earnedPoints > 0 && (
            <div className="card mb-4 flex items-center justify-between">
              <span className="text-white/70 text-sm">Points earned</span>
              <span className="text-yellow-400 font-bold">+{finalResult.earnedPoints} pts</span>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => navigate('/')} className="btn-secondary flex-1">Home</button>
            <button onClick={() => navigate('/play')} className="btn-primary flex-1">Quick Play</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: info / start screen
  if (phase === 'info') {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">📅</div>
          <h1 className="text-3xl font-bold mb-2">Daily Challenge</h1>
          <p className="text-white/50 text-sm mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          <div className="card my-6 text-left flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">🌍</span>
              <div>
                <p className="font-medium text-sm">5 rounds, worldwide locations</p>
                <p className="text-white/40 text-xs">Same locations for everyone today</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">⏱️</span>
              <div>
                <p className="font-medium text-sm">2 minutes per round</p>
                <p className="text-white/40 text-xs">Guess before the timer runs out</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">🔥</span>
              <div>
                <p className="font-medium text-sm">Build your daily streak</p>
                <p className="text-white/40 text-xs">
                  {isLoggedIn ? `Current streak: ${dailyInfo?.result ? '✓ Done today' : 'Play to start/continue'}` : 'Log in to track your streak'}
                </p>
              </div>
            </div>
          </div>

          {dailyInfo?.completed ? (
            <div className="card text-center mb-4">
              <p className="text-brand-green font-semibold">✓ Completed today</p>
              <p className="text-white/50 text-sm">Score: {dailyInfo.result?.total_score?.toLocaleString()}</p>
            </div>
          ) : (
            <button onClick={startDaily} className="btn-primary w-full text-lg py-3">
              Start Daily Challenge →
            </button>
          )}

          {dailyInfo?.completed && (
            <button onClick={() => navigate('/play')} className="btn-secondary w-full mt-3">
              Play Quick Game Instead
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Phase: playing
  const currentLoc = locations[roundIndex];
  return (
    <div className="flex-1 flex flex-col relative" style={{ height: 'calc(100vh - 57px)' }}>
      <div className="absolute inset-0">
        <StreetView lat={currentLoc?.lat} lng={currentLoc?.lng} panoId={currentLoc?.panoId} />
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <span className="bg-brand-panel/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-semibold border border-white/10">
          📅 Daily · Round {roundIndex + 1} / {DAILY_ROUNDS}
        </span>

        <div className="bg-brand-panel/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10 pointer-events-auto">
          <Timer timeLeft={timeLeft} totalTime={DAILY_TIME} />
        </div>

        <span className="bg-brand-panel/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm border border-white/10">
          <span className="text-white/50">Score: </span>
          <span className="font-bold text-brand-green">{totalScore.toLocaleString()}</span>
        </span>
      </div>

      {/* Guess Map */}
      <div
        className={`absolute bottom-4 right-4 z-20 transition-all duration-300 ${mapExpanded ? 'w-96 h-72' : 'w-52 h-36'}`}
        onMouseEnter={() => setMapExpanded(true)}
        onMouseLeave={() => setMapExpanded(false)}
      >
        <div className="w-full h-full rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
          <GuessMap onGuessChange={setGuess} disabled={false} />
        </div>
        <button
          onClick={() => submitGuess(false)}
          disabled={!guess}
          className={`z-index-999999 absolute bottom-2 left-2 right-2 py-2 rounded-lg font-bold text-sm transition-all ${
            guess
              ? 'bg-brand-green hover:bg-green-600 text-white shadow-lg'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {guess ? 'Submit Guess' : 'Click map to guess'}
        </button>
      </div>

      {roundResult && (
        <RoundResult
          score={roundResult.score}
          distanceKm={roundResult.distanceKm}
          actualLat={roundResult.actualLat}
          actualLng={roundResult.actualLng}
          guessLat={roundResult.guessLat}
          guessLng={roundResult.guessLng}
          roundNumber={roundResult.roundNumber}
          totalRounds={DAILY_ROUNDS}
          totalScore={roundResult.totalScore}
          isLastRound={roundResult.isLastRound}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}
