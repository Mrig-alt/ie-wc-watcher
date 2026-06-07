"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface PlacesAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (name: string, url: string | null) => void;
  placeholder?: string;
  className?: string;
}

export default function PlacesAutocompleteInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className,
}: PlacesAutocompleteInputProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!value || value.trim().length < 3) {
      setPredictions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setPredictions(data.predictions || []);
        if (data.predictions?.length > 0) {
          setShowDropdown(true);
        }
      } catch (e) {
        console.error("Autocomplete failed", e);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleSelect = async (prediction: Prediction) => {
    setShowDropdown(false);
    onChange(prediction.mainText);
    
    try {
      const res = await fetch(`/api/places/details?placeId=${prediction.placeId}`);
      const data = await res.json();
      onPlaceSelect(prediction.mainText, data.mapsUrl || null);
    } catch (e) {
      console.error("Place details failed", e);
      onPlaceSelect(prediction.mainText, null);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          if (predictions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        className={className}
      />
      
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md border shadow-lg max-h-60 overflow-auto">
          <ul className="py-1 text-sm text-gray-700">
            {predictions.map((p) => (
              <li
                key={p.placeId}
                onClick={() => handleSelect(p)}
                className="flex items-start px-3 py-2 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0"
              >
                <MapPin className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{p.mainText}</p>
                  {p.secondaryText && (
                    <p className="text-xs text-gray-500 truncate">{p.secondaryText}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
