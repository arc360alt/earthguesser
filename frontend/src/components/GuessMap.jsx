import React, { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

maptilersdk.config.apiKey = MAPTILER_KEY;

export default function GuessMap({ onGuessChange, disabled = false, showResult = false, actualLat, actualLng, guessLat, guessLng, fullscreen = false }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const actualMarkerRef = useRef(null);
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

        // Fit map to show both points
        const bounds = new maptilersdk.LngLatBounds(
          [Math.min(guessLng, actualLng), Math.min(guessLat, actualLat)],
          [Math.max(guessLng, actualLng), Math.max(guessLat, actualLat)]
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
  }, [showResult, actualLat, actualLng, guessLat, guessLng]);

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
