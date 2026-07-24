import { useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Search, Phone, Clock, Star, Compass, CheckCircle2 } from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Default Location: Connaught Place, New Delhi / Bandra, Mumbai
const DEFAULT_CENTER = { lat: 19.0596, lng: 72.8295 }; // Bandra West, Mumbai

interface StoreMapProps {
  storeName?: string;
  address?: string;
  phone?: string;
  city?: string;
  height?: string;
  showControls?: boolean;
}

function SearchAndRouteControl({ storeLocation }: { storeLocation: google.maps.LatLngLiteral }) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placesLib || !searchQuery) return;

    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: searchQuery,
        fields: ['displayName', 'location', 'formattedAddress'],
        locationBias: map?.getCenter() || storeLocation,
        maxResultCount: 5,
      });

      if (places && places.length > 0) {
        setNearbyPlaces(places);
        if (places[0].location) {
          map?.panTo(places[0].location);
          map?.setZoom(14);
        }
      }
    } catch (err) {
      console.error("Place search error:", err);
    }
  };

  const calculateRouteFrom = async (originLoc: google.maps.LatLngLiteral) => {
    if (!routesLib || !map) return;

    // Clear previous route polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    try {
      const { routes } = await routesLib.Route.computeRoutes({
        origin: originLoc,
        destination: storeLocation,
        travelMode: 'DRIVING',
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
      });

      if (routes && routes[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => p.setMap(map));
        polylinesRef.current = newPolylines;

        if (routes[0].viewport) {
          map.fitBounds(routes[0].viewport);
        }

        const distKm = (routes[0].distanceMeters / 1000).toFixed(1);
        const durMins = Math.round(routes[0].durationMillis / 60000);
        setRouteInfo({
          distance: `${distKm} km`,
          duration: `${durMins} mins drive`
        });
      }
    } catch (err) {
      console.error("Route calculation error:", err);
    }
  };

  return (
    <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-80 z-10 space-y-2">
      <form onSubmit={handleSearch} className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-slate-200/80 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        <input
          type="text"
          placeholder="Search nearby landmark or place..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400 font-medium"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-2xs"
        >
          Search
        </button>
      </form>

      {routeInfo && (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-400" />
            <div>
              <p className="font-bold text-white">Route to Salon</p>
              <p className="text-[11px] text-slate-300">{routeInfo.distance} • {routeInfo.duration}</p>
            </div>
          </div>
          <button
            onClick={() => {
              polylinesRef.current.forEach(p => p.setMap(null));
              polylinesRef.current = [];
              setRouteInfo(null);
            }}
            className="text-[10px] text-slate-400 hover:text-white underline"
          >
            Clear Route
          </button>
        </div>
      )}

      {nearbyPlaces.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-2 max-h-48 overflow-y-auto space-y-1 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Search Results</p>
          {nearbyPlaces.map((p, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (p.location) {
                  map?.panTo(p.location);
                  calculateRouteFrom(p.location);
                }
              }}
              className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-center justify-between group"
            >
              <div className="min-w-0 pr-2">
                <p className="font-bold text-slate-800 truncate group-hover:text-blue-600">{p.displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{p.formattedAddress}</p>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md shrink-0">
                Directions
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MainStoreMarker({ storeName, address, phone }: { storeName: string; address: string; phone: string }) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(true);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={DEFAULT_CENTER}
        onClick={() => setInfoOpen(true)}
      >
        <Pin background="#2563EB" glyphColor="#FFFFFF" borderColor="#1D4ED8">
          <MapPin className="w-4 h-4 text-white" />
        </Pin>
      </AdvancedMarker>

      {infoOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoOpen(false)}>
          <div className="p-2 max-w-xs text-slate-900 space-y-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                N
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">{storeName}</h4>
                <div className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> 4.9 (120+ reviews)
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>{address}</span>
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-medium text-emerald-700">Open Today: 10:00 AM - 9:00 PM</span>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
              <a href={`tel:${phone}`} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
                <Phone className="w-3 h-3" /> {phone}
              </a>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Verified Shop
              </span>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function StoreMap({
  storeName = "Nexora Luxury Hair & Beauty Salon",
  address = "Hill Road, Opposite St. Peter's Church, Bandra West, Mumbai, Maharashtra 400050",
  phone = "+91 98765 43210",
  height = "420px",
  showControls = true,
}: StoreMapProps) {
  if (!hasValidKey) {
    return (
      <div 
        style={{ height }}
        className="w-full rounded-2xl border border-slate-200 bg-slate-900 text-white p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm"
      >
        <div className="max-w-md space-y-3 z-10">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <h2 className="text-lg font-bold text-white">Google Maps API Key Required</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            To view interactive Google Maps with live place search and routing, please configure your key:
          </p>
          <div className="bg-slate-800/80 rounded-xl p-3 text-left text-xs border border-slate-700 space-y-1.5">
            <p className="font-semibold text-blue-400">Step-by-Step Setup:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
              <li>Get an API key from Google Cloud Console</li>
              <li>Open <strong>Settings (⚙️ top-right)</strong> → <strong>Secrets</strong></li>
              <li>Add secret named <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
              <li>Paste your Google Maps API key & press Enter</li>
            </ol>
          </div>
          <p className="text-[10px] text-slate-400">The app automatically rebuilds once your API key is provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={15}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="cooperative"
          disableDefaultUI={false}
        >
          <MainStoreMarker storeName={storeName} address={address} phone={phone} />
          {showControls && <SearchAndRouteControl storeLocation={DEFAULT_CENTER} />}
        </Map>
      </APIProvider>
    </div>
  );
}
