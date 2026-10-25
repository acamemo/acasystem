/**
 * Map of the Posizione section (REP-20261007-025), loaded on demand: Leaflet with the
 * OpenStreetMap tiles. A tap on the map or a drag of the pin moves the point; the owner
 * receives the new coordinates. The pin is a CSS dot in the accent (no image files).
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface LocationMapProps {
  value: LatLon;
  /** Zoom used the first time: close when the home is known, wide on the default centre. */
  zoom: number;
  onChange: (next: LatLon) => void;
  disabled?: boolean;
}

const pin = () =>
  L.divIcon({
    className: 'aca-location-pin',
    html: '<span class="aca-location-pin__dot"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export default function LocationMap({ value, zoom, onChange, disabled = false }: LocationMapProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create the map once.
  useEffect(() => {
    if (!host.current) return undefined;
    const instance = L.map(host.current, { zoomControl: true, attributionControl: true });
    instance.setView([value.lat, value.lon], zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    const point = L.marker([value.lat, value.lon], {
      icon: pin(),
      draggable: !disabled,
      keyboard: false,
    }).addTo(instance);
    point.on('dragend', () => {
      const { lat, lng } = point.getLatLng();
      onChangeRef.current({ lat, lon: lng });
    });
    if (!disabled) {
      instance.on('click', (event: L.LeafletMouseEvent) => {
        onChangeRef.current({ lat: event.latlng.lat, lon: event.latlng.lng });
      });
    }
    map.current = instance;
    marker.current = point;
    // The section may lay out after the map: measure again once it is on screen.
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => instance.invalidateSize());
    resize?.observe(host.current);
    return () => {
      resize?.disconnect();
      instance.remove();
      map.current = null;
      marker.current = null;
    };
    // The map is created once; value changes move the marker below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the value chosen outside (reset, saved position).
  useEffect(() => {
    const point = marker.current;
    if (!point) return;
    const current = point.getLatLng();
    if (current.lat !== value.lat || current.lng !== value.lon) {
      point.setLatLng([value.lat, value.lon]);
      map.current?.panTo([value.lat, value.lon]);
    }
  }, [value.lat, value.lon]);

  return <div ref={host} className="aca-location-map" role="application" aria-label="Mappa" />;
}
