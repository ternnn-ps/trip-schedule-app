"use client";

import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Map as LeafletMap, Marker } from "leaflet";
import { KeyboardEvent, useEffect, useRef, useState } from "react";

type LeafletModule = typeof import("leaflet");

type LocationPickerProps = {
  latitude: string;
  longitude: string;
  onChange?: (coordinates: { latitude: string; longitude: string }) => void;
  onPlaceSelect?: (placeName: string) => void;
  readOnly?: boolean;
};

type PlaceSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const defaultCenter: [number, number] = [13.7563, 100.5018];

function parseCoordinates(latitude: string, longitude: string): [number, number] | null {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lat, lng];
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  onPlaceSelect,
  readOnly = false,
}: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const initialCoordinatesRef = useRef(parseCoordinates(latitude, longitude));
  const initialCenterRef = useRef(initialCoordinatesRef.current ?? defaultCenter);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    let cancelled = false;

    async function createMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const leaflet = await import("leaflet");

      if (cancelled || !containerRef.current) {
        return;
      }

      leafletRef.current = leaflet;

      const map = leaflet.map(containerRef.current, {
        center: initialCenterRef.current,
        zoom: initialCenterRef.current === defaultCenter ? 11 : 14,
        zoomControl: true,
        attributionControl: false,
      });

      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      if (!readOnly) {
        map.on("click", (event) => {
          onChangeRef.current?.({
            latitude: event.latlng.lat.toFixed(6),
            longitude: event.latlng.lng.toFixed(6),
          });
        });
      } else {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
      }

      mapRef.current = map;

      const initialCoordinates = initialCoordinatesRef.current;

      if (initialCoordinates) {
        const pinIcon = leaflet.divIcon({
          className: "leaflet-pin-icon",
          html: "<span></span>",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        markerRef.current = leaflet.marker(initialCoordinates, { icon: pinIcon }).addTo(map);
      }
    }

    createMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, [readOnly]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;

    if (!leaflet || !map) {
      return;
    }

    const nextCoordinates = parseCoordinates(latitude, longitude);

    if (!nextCoordinates) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const pinIcon = leaflet.divIcon({
      className: "leaflet-pin-icon",
      html: "<span></span>",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    if (!markerRef.current) {
      markerRef.current = leaflet.marker(nextCoordinates, { icon: pinIcon }).addTo(map);
    } else {
      markerRef.current.setLatLng(nextCoordinates);
    }

    map.setView(nextCoordinates, Math.max(map.getZoom(), 13));
  }, [latitude, longitude]);

  async function handleSearchPlace() {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setSearchError("Type a place name to search.");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(trimmedQuery)}`,
      );

      if (!response.ok) {
        throw new Error("Place search failed.");
      }

      const places = (await response.json()) as PlaceSearchResult[];
      setResults(places);

      if (places.length === 0) {
        setSearchError("No places found. Try a more specific name.");
      }
    } catch {
      setResults([]);
      setSearchError("Could not search places right now. You can still click the map to pin manually.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearchPlace();
    }
  }

  function handleSelectPlace(result: PlaceSearchResult) {
    const coordinates = {
      latitude: Number(result.lat).toFixed(6),
      longitude: Number(result.lon).toFixed(6),
    };

    onChangeRef.current?.(coordinates);
    onPlaceSelectRef.current?.(result.display_name.split(",")[0] ?? result.display_name);
    setQuery(result.display_name);
    setResults([]);
    setSearchError("");
  }

  if (readOnly) {
    return <div ref={containerRef} className="map-preview" />;
  }

  return (
    <Stack spacing={1.25}>
      <Box className="map-search-panel">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            label="Search place"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search hotel, station, cafe..."
            size="small"
            fullWidth
          />
          <Button
            type="button"
            variant="outlined"
            onClick={handleSearchPlace}
            disabled={isSearching}
            sx={{ minWidth: { sm: 110 } }}
          >
            {isSearching ? <CircularProgress size={18} /> : "Search"}
          </Button>
        </Stack>

        {searchError ? (
          <Typography sx={{ mt: 1, color: "var(--coral)", fontSize: "0.88rem" }}>
            {searchError}
          </Typography>
        ) : null}

        {results.length > 0 ? (
          <List dense className="map-search-results">
            {results.map((result) => (
              <ListItemButton
                key={`${result.lat}-${result.lon}-${result.display_name}`}
                onClick={() => handleSelectPlace(result)}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {result.display_name.split(",")[0]}
                  </Typography>
                  <Typography noWrap sx={{ color: "var(--muted)", fontSize: "0.86rem" }}>
                    {result.display_name}
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>
        ) : null}
      </Box>

      <div ref={containerRef} className="map-picker" />
    </Stack>
  );
}
