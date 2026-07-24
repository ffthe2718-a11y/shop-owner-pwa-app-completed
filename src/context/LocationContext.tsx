import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LocationData {
  address: string;
  area: string;
  city: string;
  pincode?: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  isAutoDetected: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
}

interface LocationContextType {
  location: LocationData;
  isLoading: boolean;
  error: string | null;
  detectLocation: () => Promise<boolean>;
  setManualLocation: (loc: Partial<LocationData>) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  hasPrompted: boolean;
}

const DEFAULT_LOCATION: LocationData = {
  address: "Hill Road, Bandra West",
  area: "Bandra West",
  city: "Mumbai",
  pincode: "400050",
  lat: 19.0596,
  lng: 72.8295,
  formattedAddress: "Hill Road, Bandra West, Mumbai, Maharashtra 400050",
  isAutoDetected: false,
  permissionState: 'prompt',
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationData>(() => {
    try {
      const saved = localStorage.getItem('nexora_user_location');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_LOCATION;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('nexora_location_prompted'));
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('nexora_user_location', JSON.stringify(location));
    } catch (e) {
      console.error(e);
    }
  }, [location]);

  // Auto-prompt on first login/signup/visit if not prompted yet
  useEffect(() => {
    if (!hasPrompted) {
      const timer = setTimeout(() => {
        setIsModalOpen(true);
      }, 800); // short delay for crisp app entrance animation
      return () => clearTimeout(timer);
    }
  }, [hasPrompted]);

  const reverseGeocode = async (lat: number, lng: number): Promise<Partial<LocationData>> => {
    // 1. Try Google Maps Geocoder if loaded
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results[0]) {
          const result = response.results[0];
          let area = '';
          let city = '';
          let pincode = '';
          
          for (const component of result.address_components) {
            const types = component.types;
            if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood')) {
              area = component.long_name;
            }
            if (types.includes('locality') || types.includes('administrative_area_level_2')) {
              city = component.long_name;
            }
            if (types.includes('postal_code')) {
              pincode = component.long_name;
            }
          }

          return {
            address: area ? `${area}, ${city}` : result.formatted_address.split(',')[0],
            area: area || city || 'Current Location',
            city: city || 'Your City',
            pincode,
            formattedAddress: result.formatted_address,
          };
        }
      } catch (err) {
        console.warn('Google Maps geocoding error:', err);
      }
    }

    // 2. OpenStreetMap Nominatim reverse geocode fallback
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.quarter || 'Current Location';
        const city = addr.city || addr.town || addr.state_district || addr.county || 'Your City';
        const pincode = addr.postcode || '';
        const shortAddress = [area, city].filter(Boolean).join(', ');

        return {
          address: shortAddress || data.display_name.split(',')[0],
          area,
          city,
          pincode,
          formattedAddress: data.display_name || `${shortAddress}, ${pincode}`,
        };
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode error:', err);
    }

    // 3. Fallback coordinates description
    return {
      address: `GPS Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      area: 'Detected Area',
      city: 'Current Location',
      formattedAddress: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
    };
  };

  const detectLocation = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    localStorage.setItem('nexora_location_prompted', 'true');
    setHasPrompted(true);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const geoData = await reverseGeocode(lat, lng);

          const newLoc: LocationData = {
            address: geoData.address || `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
            area: geoData.area || 'Current Area',
            city: geoData.city || 'Detected City',
            pincode: geoData.pincode || '',
            lat,
            lng,
            formattedAddress: geoData.formattedAddress || `${geoData.address}, ${geoData.city}`,
            isAutoDetected: true,
            permissionState: 'granted',
          };

          setLocation(newLoc);
          setIsLoading(false);
          setIsModalOpen(false);
          resolve(true);
        },
        (err) => {
          console.error('Geolocation error:', err);
          let errMsg = 'Failed to get location.';
          if (err.code === err.PERMISSION_DENIED) {
            errMsg = 'Location permission was denied. Please select your location manually.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errMsg = 'Location information is unavailable.';
          } else if (err.code === err.TIMEOUT) {
            errMsg = 'Location request timed out.';
          }
          setError(errMsg);
          setLocation((prev) => ({ ...prev, permissionState: 'denied' }));
          setIsLoading(false);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const setManualLocation = (locData: Partial<LocationData>) => {
    localStorage.setItem('nexora_location_prompted', 'true');
    setHasPrompted(true);

    setLocation((prev) => {
      const updated: LocationData = {
        ...prev,
        ...locData,
        isAutoDetected: false,
        permissionState: locData.permissionState || prev.permissionState,
      };
      return updated;
    });
    setIsModalOpen(false);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        isLoading,
        error,
        detectLocation,
        setManualLocation,
        isModalOpen,
        setIsModalOpen,
        hasPrompted,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
