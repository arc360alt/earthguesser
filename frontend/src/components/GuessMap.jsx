import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function GuessMap({ onGuessChange, disabled = false, showResult = false, actualLat, actualLng, guessLat, guessLng }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const guessMarkerRef = useRef(null);
  const actualMarkerRef = useRef(null);
  const lineRef = useRef(null);
  const initializedRef = useRef(false);

  const guessIcon = L.divIcon({
    className: 'guess-marker',
    html: '<div style="background:#e94560;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const actualIcon = L.divIcon({
    className: 'guess-marker',
    html: '<div style="background:#4caf50;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  useEffect(() => {
    if (initializedRef.current) return;
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      preferCanvas: true,
    });

    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      updateWhenIdle: false,
      updateInterval: 100,
    }).addTo(map);

    // Preload tiles at zoom 2
    tileLayer.on('load', () => {
      map.preloadZoom(3);
    });

    mapRef.current = map;
    initializedRef.current = true;

    if (!disabled && !showResult) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (guessMarkerRef.current) {
          guessMarkerRef.current.setLatLng([lat, lng]);
        } else {
          guessMarkerRef.current = L.marker([lat, lng], { icon: guessIcon }).addTo(map);
        }
        onGuessChange?.({ lat, lng });
      });
    }

    return () => {
      initializedRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!showResult || !mapRef.current || !actualLat || !actualLng) return;
    const map = mapRef.current;

    if (actualMarkerRef.current) actualMarkerRef.current.remove();
    actualMarkerRef.current = L.marker([actualLat, actualLng], { icon: actualIcon }).addTo(map);

    if (guessMarkerRef.current) guessMarkerRef.current.remove();
    if (guessLat && guessLng) {
      guessMarkerRef.current = L.marker([guessLat, guessLng], { icon: guessIcon }).addTo(map);

      if (lineRef.current) lineRef.current.remove();
      lineRef.current = L.polyline([[guessLat, guessLng], [actualLat, actualLng]], {
        color: '#ffb300',
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);

      const bounds = L.latLngBounds([
        [guessLat, guessLng],
        [actualLat, actualLng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    } else {
      map.setView([actualLat, actualLng], 5);
    }
  }, [showResult, actualLat, actualLng, guessLat, guessLng]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" style={{ background: '#1a1a2e' }} />
  );
}