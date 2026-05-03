export type GoogleMapPlace = {
  url: string;
  placeName?: string;
  latitude?: string;
  longitude?: string;
};

function decodePlaceName(value: string) {
  return decodeURIComponent(value)
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toCoordinate(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue.toFixed(6) : undefined;
}

function readQueryCoordinates(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  return {
    latitude: toCoordinate(match[1]),
    longitude: toCoordinate(match[2]),
  };
}

export function parseGoogleMapUrl(input: string): GoogleMapPlace | null {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedInput);
  } catch {
    return null;
  }

  if (!/(^|\.)google\.[a-z.]+$/.test(parsedUrl.hostname) && parsedUrl.hostname !== "maps.app.goo.gl") {
    return null;
  }

  const normalizedUrl = parsedUrl.toString();
  const pathPlaceMatch = parsedUrl.pathname.match(/\/place\/([^/]+)/);
  const atCoordinatesMatch = normalizedUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const dataCoordinatesMatch = normalizedUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const queryCoordinates =
    readQueryCoordinates(parsedUrl.searchParams.get("query")) ??
    readQueryCoordinates(parsedUrl.searchParams.get("q")) ??
    readQueryCoordinates(parsedUrl.searchParams.get("ll")) ??
    readQueryCoordinates(parsedUrl.searchParams.get("destination"));
  const queryPlace =
    parsedUrl.searchParams.get("query") ??
    parsedUrl.searchParams.get("q") ??
    parsedUrl.searchParams.get("destination");

  const coordinateMatch = atCoordinatesMatch ?? dataCoordinatesMatch;
  const placeName =
    pathPlaceMatch?.[1] ? decodePlaceName(pathPlaceMatch[1]) : queryPlace && !queryCoordinates ? decodePlaceName(queryPlace) : undefined;

  return {
    url: normalizedUrl,
    placeName,
    latitude: coordinateMatch ? toCoordinate(coordinateMatch[1]) : queryCoordinates?.latitude,
    longitude: coordinateMatch ? toCoordinate(coordinateMatch[2]) : queryCoordinates?.longitude,
  };
}

export function getGoogleMapUrl(place: {
  googleMapUrl?: string;
  latitude?: string;
  longitude?: string;
  place?: string;
}) {
  if (place.googleMapUrl?.trim()) {
    return place.googleMapUrl.trim();
  }

  if (place.latitude && place.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place ?? "")}`;
}
