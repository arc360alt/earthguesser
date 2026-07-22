import React, { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

maptilersdk.config.apiKey = MAPTILER_KEY;

// Bounding boxes for region_radar highlight — [minLng, minLat, maxLng, maxLat]
const REGION_BOUNDS = {
  'Europe':        [-25, 34,  45,  72],
  'North America': [-170, 14, -50, 74],
  'South America': [-83, -57, -33, 14],
  'Asia':          [25,  -5,  180, 78],
  'Africa':        [-20, -38,  56, 40],
  'Oceania':       [100, -52, 180,  6],
};

export default function GuessMap({ onGuessChange, disabled = false, showResult = false, actualLat, actualLng, guessLat, guessLng, fullscreen = false, regionRadar = null, opponentGuess = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const actualMarkerRef = useRef(null);
  const opponentMarkerRef = useRef(null);
  const lineRef = useRef(null);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.STREETS,
      zoom: 1,
      center: [0, 20],
      navigationControl: false,
      geolocateControl: false,
    });

    mapRef.current = map;

    if (!disabled && !showResult) {
      map.on('click', (e) => {
        const { lng, lat } = e.lngLat;

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new maptilersdk.Marker({ color: '#e94560' })
            .setLngLat([lng, lat])
            .addTo(map);
        }

        setPlaced(true);
        onGuessChange?.({ lat, lng });
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Draw region_radar bounding box when the bonus is active
  useEffect(() => {
    if (!showResult || !regionRadar || !mapRef.current) return;
    const map = mapRef.current;
    const bounds = REGION_BOUNDS[regionRadar];
    if (!bounds) return;

    const [minLng, minLat, maxLng, maxLat] = bounds;
    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]],
      },
    };

    const addRadar = () => {
      if (map.getSource('region-radar')) return;
      map.addSource('region-radar', { type: 'geojson', data: geojson });
      map.addLayer({ id: 'region-radar-fill', type: 'fill', source: 'region-radar', paint: { 'fill-color': '#4caf50', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'region-radar-line', type: 'line', source: 'region-radar', paint: { 'line-color': '#4caf50', 'line-width': 2, 'line-opacity': 0.6 } });
    };

    if (map.loaded()) addRadar();
    else map.on('load', addRadar);
  }, [showResult, regionRadar]);

  // Show result lines & markers
  useEffect(() => {
    if (!showResult || !mapRef.current || !actualLat || !actualLng) return;
    const map = mapRef.current;

    const showOnMap = () => {
      // Actual location marker (green)
      if (actualMarkerRef.current) actualMarkerRef.current.remove();
      actualMarkerRef.current = new maptilersdk.Marker({ color: '#4caf50' })
        .setLngLat([actualLng, actualLat])
        .addTo(map);

      // Guess marker (red)
      if (markerRef.current) markerRef.current.remove();
      if (guessLat && guessLng) {
        markerRef.current = new maptilersdk.Marker({ color: '#e94560' })
          .setLngLat([guessLng, guessLat])
          .addTo(map);
      }

      // Opponent's guess marker (purple) — duel round results
      if (opponentMarkerRef.current) opponentMarkerRef.current.remove();
      if (opponentGuess?.lat != null && opponentGuess?.lng != null) {
        opponentMarkerRef.current = new maptilersdk.Marker({ color: '#7c3aed' })
          .setLngLat([opponentGuess.lng, opponentGuess.lat])
          .addTo(map);
      }

      // Draw line between guess and actual
      if (guessLat && guessLng) {
        const sourceId = 'result-line';
        if (map.getSource(sourceId)) {
          map.removeLayer(sourceId);
          map.removeSource(sourceId);
        }

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [guessLng, guessLat],
                [actualLng, actualLat],
              ],
            },
          },
        });

        map.addLayer({
          id: sourceId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#ffb300',
            'line-width': 2,
            'line-dasharray': [3, 3],
          },
        });
      }

      // Fit map to show every point we have (actual, your guess, opponent's guess)
      const points = [[actualLng, actualLat]];
      if (guessLat && guessLng) points.push([guessLng, guessLat]);
      if (opponentGuess?.lat != null && opponentGuess?.lng != null) points.push([opponentGuess.lng, opponentGuess.lat]);

      if (points.length > 1) {
        const lngs = points.map((p) => p[0]);
        const lats = points.map((p) => p[1]);
        const bounds = new maptilersdk.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        );
        map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 800 });
      } else {
        map.flyTo({ center: [actualLng, actualLat], zoom: 5 });
      }
    };

    if (map.loaded()) {
      showOnMap();
    } else {
      map.on('load', showOnMap);
    }
  }, [showResult, actualLat, actualLng, guessLat, guessLng, opponentGuess]);

  if (!MAPTILER_KEY || MAPTILER_KEY === 'your_maptiler_api_key_here') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel rounded-xl">
        <p className="text-white/50 text-sm text-center p-4">MapTiler API key not configured</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${showResult ? 'result-map-container' : 'guess-map-container'}`}
    />
  );
}
