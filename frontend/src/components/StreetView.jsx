import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../utils/api';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const VITE_PROVIDER = (import.meta.env.VITE_STREETVIEW_PROVIDER || 'google').toLowerCase();

let googleLoaded = false;
let loadPromise = null;

function loadGoogleMaps() {
  if (googleLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loadPromise;
}

export default function StreetView({ lat, lng, noPan = false, panoId = null, heading = null, onLoad }) {
  const [resolved, setResolved] = useState({ status: 'loading', provider: VITE_PROVIDER });
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    let cancelled = false;
    api
      .get('/streetview')
      .then((r) => {
        if (cancelled) return;
        const p = (r.data?.provider || VITE_PROVIDER).toLowerCase();
        setResolved({ status: 'ready', provider: p, meta: r.data });
      })
      .catch(() => {
        if (cancelled) return;
        setResolved({ status: 'ready', provider: VITE_PROVIDER, meta: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (resolved.status === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel">
        <div className="text-center text-white/60 p-8">
          <div className="text-4xl mb-4">🧭</div>
          <p className="font-semibold text-white">Resolving street imagery…</p>
        </div>
      </div>
    );
  }

  if (resolved.provider === 'kartaview') {
    return <KartaViewStreetView lat={lat} lng={lng} noPan={noPan} onLoad={onLoadRef.current} />;
  }

  if (resolved.provider === 'mapillary') {
    return <MapillaryStreetView lat={lat} lng={lng} noPan={noPan} meta={resolved.meta} onLoad={onLoadRef.current} />;
  }

  return <GoogleStreetView lat={lat} lng={lng} noPan={noPan} panoId={panoId} heading={heading} onLoad={onLoadRef.current} />;
}

function GoogleStreetView({ lat, lng, noPan = false, panoId = null, heading = null, onLoad }) {
  const containerRef = useRef(null);
  const panoramaRef = useRef(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (!lat || !lng) return;

    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (!containerRef.current || cancelled) return;

      const opts = {
        addressControl: false,
        disableDefaultUI: false,
        clickToGo: !noPan,
        showRoadLabels: false,
        motionTracking: false,
        motionTrackingControl: false,
        panControl: !noPan,
        fullscreenControl: false,
        linksControl: !noPan,
        scrollwheel: !noPan,
      };

      if (panoId) {
        opts.pano = panoId;
      } else {
        opts.position = { lat, lng };
      }

      if (heading != null) {
        opts.pov = { heading, pitch: 0 };
      }

      // Reuse panorama instance or create new one
      if (panoramaRef.current) {
        panoramaRef.current.setOptions(opts);
        if (panoId) {
          panoramaRef.current.setPano(panoId);
        } else {
          panoramaRef.current.setPosition({ lat, lng });
        }
      } else {
        containerRef.current.innerHTML = '';
        const panorama = new window.google.maps.StreetViewPanorama(containerRef.current, opts);
        panoramaRef.current = panorama;

        // Handle WebGL context loss
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) {
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost, attempting to restore...');
            setTimeout(() => {
              if (!cancelled && containerRef.current) {
                containerRef.current.innerHTML = '';
                panoramaRef.current = null;
                // Re-initialize
                const newPanorama = new window.google.maps.StreetViewPanorama(containerRef.current, opts);
                panoramaRef.current = newPanorama;
              }
            }, 1000);
          });
        }

        if (onLoadRef.current) {
          panorama.addListener('pano_changed', () => {
            if (!cancelled) onLoadRef.current();
          });
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, noPan, panoId, heading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      panoramaRef.current = null;
    };
  }, []);

  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_google_maps_api_key_here') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel">
        <div className="text-center text-white/60 p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="font-semibold text-white">Google Maps API key not configured</p>
          <p className="text-sm mt-1">Add your key to <code className="bg-white/10 px-1 rounded">frontend/.env</code></p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full street-view-container" />;
}

function KartaViewStreetView({ lat, lng, noPan = false, onLoad }) {
  const containerRef = useRef(null);
  const [state, setState] = useState({ status: 'idle' });
  const dragRef = useRef({ dragging: false, startX: 0, startPos: 0 });
  const [bgPos, setBgPos] = useState(0);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const key = useMemo(() => {
    if (!lat || !lng) return null;
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  }, [lat, lng]);

  useEffect(() => {
    let cancelled = false;
    if (!lat || !lng) return;

    setState({ status: 'loading' });
    api
      .get('/kartaview/nearest', {
        params: { lat, lng, radius: 2000, only360: 0 },
      })
      .then((r) => {
        if (cancelled) return;
        if (!r.data?.found) {
          setState({ status: 'no_coverage' });
          return;
        }
        setState({ status: 'ready', pano: r.data });
        if (onLoadRef.current) onLoadRef.current();
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (state.status === 'ready') setBgPos(0);
  }, [state.status]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel">
        <div className="text-center text-white/60 p-8">
          <div className="text-4xl mb-4">🌐</div>
          <p className="font-semibold text-white">Loading KartaView…</p>
          <p className="text-sm mt-1">Finding the nearest 360 image.</p>
        </div>
      </div>
    );
  }

  if (state.status === 'no_coverage') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel">
        <div className="text-center text-white/60 p-8 max-w-md">
          <div className="text-4xl mb-4">📷</div>
          <p className="font-semibold text-white">No KartaView coverage here</p>
          <p className="text-sm mt-1">Try another round/region, or switch provider back to Google.</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel">
        <div className="text-center text-white/60 p-8 max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="font-semibold text-white">KartaView failed to load</p>
          <p className="text-sm mt-1">The upstream API may be down or blocked by your network.</p>
        </div>
      </div>
    );
  }

  function onPointerDown(e) {
    if (noPan) return;
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startPos = bgPos;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  }

  function onPointerMove(e) {
    if (noPan) return;
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    setBgPos(dragRef.current.startPos - dx * 0.15);
  }

  function onPointerUp(e) {
    if (noPan) return;
    dragRef.current.dragging = false;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  }

  return (
    <div className="w-full h-full relative">
      <div
        ref={containerRef}
        className="w-full h-full select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          backgroundImage: `url("${state.pano.imageUrl}")`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          backgroundPosition: `${bgPos}px 50%`,
          cursor: noPan ? 'default' : (dragRef.current.dragging ? 'grabbing' : 'grab'),
        }}
        aria-label="KartaView 360 viewer"
      />
      {!noPan && state.status === 'ready' && (
        <div className="absolute bottom-3 left-3 z-10 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80">
          KartaView mode (360 photos). Drag to look around.
        </div>
      )}
    </div>
  );
}

import { Viewer } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';

function MapillaryStreetView({ lat, lng, noPan = false, meta = null, onLoad }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [state, setState] = useState({ status: 'idle' });
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const loadedRef = useRef(false);
  const retryCountRef = useRef(0);

  const key = useMemo(() => {
    if (!lat || !lng) return null;
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  }, [lat, lng]);

  useEffect(() => {
    let cancelled = false;
    if (!lat || !lng) return;
    setState({ status: 'loading' });
    api
      .get('/mapillary/nearest', { params: { lat, lng } })
      .then((r) => {
        if (cancelled) return;
        if (!r.data?.found) {
          setState({ status: 'no_coverage' });
          return;
        }
        setState({ status: 'ready', imageId: r.data.id });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => {
    if (state.status !== 'ready' || !containerRef.current) return;

    // Clean up previous viewer
    if (viewerRef.current) {
      viewerRef.current.remove();
      viewerRef.current = null;
      loadedRef.current = false;
    }

    loadedRef.current = false;
    retryCountRef.current = 0;

    function createViewer() {
      if (!containerRef.current) return;

      // Handle WebGL context loss
      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('Mapillary WebGL context lost, recreating viewer...');
          if (viewerRef.current) {
            viewerRef.current.remove();
            viewerRef.current = null;
          }
          retryCountRef.current += 1;
          if (retryCountRef.current <= 2) {
            setTimeout(createViewer, 1000);
          }
        });
      }

      viewerRef.current = new Viewer({
        accessToken: import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN,
        container: containerRef.current,
        imageId: state.imageId,
        dataProvider: undefined,
        component: {
          cover: false,
          navigation: !noPan,
          sequence: !noPan,
        },
      });
      viewerRef.current.on('loaded', () => {
        if (!loadedRef.current && onLoadRef.current) {
          loadedRef.current = true;
          onLoadRef.current();
        }
      });
      viewerRef.current.on('error', () => {
        if (retryCountRef.current <= 2) {
          retryCountRef.current += 1;
          console.warn('Mapillary viewer error, retrying...');
          if (viewerRef.current) {
            viewerRef.current.remove();
            viewerRef.current = null;
          }
          setTimeout(createViewer, 1000);
        }
      });
    }

    createViewer();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.remove();
        viewerRef.current = null;
        loadedRef.current = false;
      }
    };
  }, [state.imageId]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel">
        <div className="text-center text-white/60 p-8">
          <div className="text-4xl mb-4">🛰️</div>
          <p className="font-semibold text-white">Loading Mapillary…</p>
          {meta?.failoverFrom === 'kartaview' && (
            <p className="text-sm mt-1">KartaView is unavailable; using Mapillary as fallback.</p>
          )}
        </div>
      </div>
    );
  }

  if (state.status === 'no_coverage') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel">
        <div className="text-center text-white/60 p-8 max-w-md">
          <div className="text-4xl mb-4">📷</div>
          <p className="font-semibold text-white">No Mapillary imagery here</p>
          <p className="text-sm mt-1">Try another round/region.</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-brand-panel">
        <div className="text-center text-white/60 p-8 max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="font-semibold text-white">Mapillary failed to load</p>
          <p className="text-sm mt-1">Check MAPILLARY_ACCESS_TOKEN in backend/.env</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={`https://www.mapillary.com/embed?image_key=${state.imageId}&style=photo`}
      className="w-full h-full border-0"
      allowFullScreen
    />
  );
}