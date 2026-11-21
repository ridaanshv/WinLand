import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { Search, MapPin, CloudSun, Wind, Droplets, Sparkles, LocateFixed } from 'lucide-react';

interface SelectedPlaceInfo {
  name: string;
  address: string;
  position: { lat: number; lng: number };
}

interface WeatherMapsPanelProps {
  mapsApiKey: string;
  userCoords: { lat: number; lng: number };
  onUpdateCoords: (coords: { lat: number; lng: number }) => void;
  onAskMapsAi: (prompt: string) => void;
  onHaptic: (style?: 'tap' | 'toggle' | 'success' | 'alert') => void;
  darkMode?: boolean;
}

interface PlaceLocationLike {
  lat: () => number;
  lng: () => number;
}

interface PlaceInstanceLike {
  displayName?: string;
  formattedAddress?: string;
  location?: PlaceLocationLike;
  fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
}

interface AutocompleteSuggestionLike {
  placePrediction?: {
    text: { text: string };
    toPlace: () => PlaceInstanceLike;
  };
}

interface PlacesLibraryLike {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (req: {
      input: string;
      sessionToken: unknown;
    }) => Promise<{ suggestions?: AutocompleteSuggestionLike[] }>;
  };
}

function PlacesSearchBar({
  onSelectPlace,
}: {
  onSelectPlace: (place: SelectedPlaceInfo) => void;
}) {
  const placesLib = useMapsLibrary('places') as PlacesLibraryLike | null;
  const sessionTokenRef = useRef<unknown>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionLike[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!placesLib || !query.trim()) {
      setSuggestions([]);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    setLoading(true);
    AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query.trim(),
      sessionToken: sessionTokenRef.current,
    })
      .then((res: { suggestions?: AutocompleteSuggestionLike[] }) => {
        if (!cancelled) {
          setSuggestions(res.suggestions ?? []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoading(false);
          const msg = String(err);
          if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT') || msg.includes('429')) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [placesLib, query]);

  const handleChoose = useCallback(
    async (suggestion: AutocompleteSuggestionLike) => {
      if (!placesLib || !suggestion.placePrediction) return;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        if (place.location) {
          onSelectPlace({
            name: place.displayName || suggestion.placePrediction.text.text,
            address: place.formattedAddress || '',
            position: {
              lat: place.location.lat(),
              lng: place.location.lng(),
            },
          });
        }
        setQuery('');
        setSuggestions([]);
        sessionTokenRef.current = null;
      } catch (err) {
        const msg = String(err);
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    },
    [placesLib, onSelectPlace]
  );

  return (
    <div className="relative">
      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search any place or address via Places API (New)…"
        aria-label="Search Google Maps places"
        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#14161b] border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#8ba3ff]"
      />
      {loading && (
        <span className="text-[10px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2">
          Searching…
        </span>
      )}
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl bg-[#101218] border border-white/15 shadow-2xl overflow-hidden max-h-44 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => void handleChoose(s)}
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-[#1e222e] flex items-center gap-2 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{s.placePrediction?.text.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MapViewportInner({
  center,
  selectedPlace,
  onSelectPlace,
  darkMode,
}: {
  center: { lat: number; lng: number };
  selectedPlace: SelectedPlaceInfo | null;
  onSelectPlace: (place: SelectedPlaceInfo | null) => void;
  darkMode: boolean;
}) {
  const status = useApiLoadingStatus();
  const [infoOpen, setInfoOpen] = useState(true);

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="h-[225px] rounded-2xl bg-[#111319] border border-white/10 flex flex-col items-center justify-center text-center p-4">
        <MapPin className="w-6 h-6 text-amber-400 mb-2" />
        <p className="text-xs font-medium text-zinc-200">Unable to load Google Maps</p>
        <p className="text-[11px] text-zinc-400 mt-1">
          Check your network connection or Google Maps API key configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[225px] w-full rounded-2xl overflow-hidden border border-white/10 bg-[#111319]">
      <GoogleMap
        center={selectedPlace?.position ?? center}
        defaultZoom={12}
        mapId="DEMO_MAP_ID"
        colorScheme={darkMode ? 'DARK' : 'LIGHT'}
        gestureHandling="greedy"
        disableDefaultUI
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <AdvancedMarker
          position={selectedPlace?.position ?? center}
          onClick={() => setInfoOpen(true)}
        >
          <Pin background="#34d399" borderColor="#064e3b" glyphColor="#052e16" />
        </AdvancedMarker>
        {selectedPlace && infoOpen && (
          <InfoWindow
            position={selectedPlace.position}
            onCloseClick={() => {
              setInfoOpen(false);
              onSelectPlace(null);
            }}
          >
            <div className="text-zinc-900 p-0.5 max-w-[180px]">
              <p className="text-xs font-semibold">{selectedPlace.name}</p>
              {selectedPlace.address && (
                <p className="text-[11px] text-zinc-600 mt-0.5">{selectedPlace.address}</p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

export const WeatherMapsPanel: React.FC<WeatherMapsPanelProps> = ({
  mapsApiKey,
  userCoords,
  onUpdateCoords,
  onAskMapsAi,
  onHaptic,
  darkMode = true,
}) => {
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlaceInfo | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const handleUseMyLocation = () => {
    onHaptic('tap');
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation unavailable in this browser.');
      return;
    }
    setGeoStatus('Locating…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onUpdateCoords(next);
        setSelectedPlace(null);
        setGeoStatus('Location updated');
        onHaptic('success');
      },
      () => {
        setGeoStatus('Location permission declined — using default coordinates.');
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Weather + Quick Location Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#12141a] border border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <CloudSun className="w-7 h-7 text-[#8ba3ff] shrink-0" />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-tabular text-xl font-semibold text-white">18°C</span>
              <span className="text-xs text-zinc-300">Partly Cloudy</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Wind className="w-3 h-3" /> 12 km/h
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Droplets className="w-3 h-3" /> 58%
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {userCoords.lat.toFixed(3)}, {userCoords.lng.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b1f29] hover:bg-[#252a38] text-zinc-200 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>My Location</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onHaptic('tap');
              onAskMapsAi(
                'What are the top rated quiet coffee shops and workspaces near my current location?'
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e241e] hover:bg-[#14332a] text-emerald-300 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Maps AI</span>
          </button>
        </div>
      </div>

      {geoStatus && <p className="text-[11px] text-zinc-400 px-1">{geoStatus}</p>}

      {mapsApiKey ? (
        <APIProvider
          apiKey={mapsApiKey}
          language="en"
          region="US"
          libraries={['places', 'marker']}
        >
          <div className="space-y-2.5">
            <PlacesSearchBar
              onSelectPlace={(place) => {
                onHaptic('success');
                setSelectedPlace(place);
                onUpdateCoords(place.position);
              }}
            />
            <MapViewportInner
              center={userCoords}
              selectedPlace={selectedPlace}
              onSelectPlace={setSelectedPlace}
              darkMode={darkMode}
            />
          </div>
        </APIProvider>
      ) : (
        <div className="h-[225px] rounded-2xl bg-[#111319] border border-white/[0.06] p-5 flex flex-col items-center justify-center text-center space-y-2">
          <MapPin className="w-6 h-6 text-[#8ba3ff]" />
          <p className="text-xs font-semibold text-zinc-200">Google Maps Platform Ready</p>
          <p className="text-[11px] text-zinc-400 max-w-md leading-relaxed">
            Configure <code className="font-mono-tabular text-zinc-300">VITE_GOOGLE_MAPS_API_KEY</code> in your environment to render live interactive map tiles and Places API (New) autocomplete. You can also query live place data via Maps Grounding in the AI Copilot tab.
          </p>
        </div>
      )}
    </div>
  );
};
