'use client';
import { createContext, useContext, useEffect, useState } from 'react';

interface LocationContextValue {
  city: string;
  setCity: (city: string) => void;
  availableCities: string[];
}

const LocationContext = createContext<LocationContextValue>({
  city: 'Mumbai',
  setCity: () => {},
  availableCities: [],
});

export const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 
  'Kolkata', 'Pune', 'Ahmedabad', 'Kochi', 'Jaipur'
];

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<string>('Mumbai');

  useEffect(() => {
    const saved = localStorage.getItem('cinebook_city');
    if (saved && CITIES.includes(saved)) {
      setCityState(saved);
    } else {
      localStorage.setItem('cinebook_city', 'Mumbai');
    }
  }, []);

  const setCity = (newCity: string) => {
    if (CITIES.includes(newCity)) {
      setCityState(newCity);
      localStorage.setItem('cinebook_city', newCity);
      // Dispatch custom event to notify other components instantly
      window.dispatchEvent(new Event('cinebook_city_changed'));
    }
  };

  return (
    <LocationContext.Provider value={{ city, setCity, availableCities: CITIES }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
