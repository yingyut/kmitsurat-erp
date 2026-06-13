"use client";
import { useEffect, useRef, useState } from "react";
import { PROVINCE_COORDS } from "@/lib/thailand-coords";

interface Props {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
  province?: string;
  district?: string;
  subdistrict?: string;
}

type ViewTarget = { center: [number, number]; zoom: number };

async function geocodeTH(query: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + " ประเทศไทย")}&format=json&limit=1`,
      { headers: { "Accept-Language": "th" } }
    );
    const data = await res.json();
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

export default function MapPicker({ lat, lng, onChange, province, district, subdistrict }: Props) {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [RL, setRL] = useState<typeof import("react-leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState<[number, number] | null>(
    lat != null && lng != null ? [lat, lng] : null
  );
  const [latStr, setLatStr] = useState(lat != null ? String(lat) : "");
  const [lngStr, setLngStr] = useState(lng != null ? String(lng) : "");
  const [viewTarget, setViewTarget] = useState<ViewTarget | null>(null);

  useEffect(() => {
    Promise.all([import("leaflet"), import("react-leaflet")]).then(([l, rl]) => {
      setL(l); setRL(rl); setReady(true);
    });
  }, []);

  // Sync when parent changes lat/lng (edit mode)
  const prevLatLng = useRef("");
  useEffect(() => {
    const key = `${lat},${lng}`;
    if (lat != null && lng != null && key !== prevLatLng.current) {
      prevLatLng.current = key;
      const p: [number, number] = [lat, lng];
      setPos(p);
      setLatStr(lat.toFixed(6));
      setLngStr(lng.toFixed(6));
      setViewTarget({ center: p, zoom: 15 });
    }
  }, [lat, lng]);

  // Fly to province
  const prevProvince = useRef("");
  useEffect(() => {
    if (!province || province === prevProvince.current) return;
    prevProvince.current = province;
    const coords = PROVINCE_COORDS[province];
    if (coords) setViewTarget({ center: coords, zoom: 10 });
  }, [province]);

  // Fly to district (geocode)
  const prevDistrict = useRef("");
  useEffect(() => {
    if (!district || !province || district === prevDistrict.current) return;
    prevDistrict.current = district;
    geocodeTH(`อำเภอ${district} จังหวัด${province}`).then(coords => {
      if (coords) setViewTarget({ center: coords, zoom: 12 });
    });
  }, [district, province]);

  // Fly to subdistrict (geocode)
  const prevSubdistrict = useRef("");
  useEffect(() => {
    if (!subdistrict || !district || subdistrict === prevSubdistrict.current) return;
    prevSubdistrict.current = subdistrict;
    geocodeTH(`ตำบล${subdistrict} อำเภอ${district} จังหวัด${province}`).then(coords => {
      if (coords) setViewTarget({ center: coords, zoom: 14 });
    });
  }, [subdistrict, district, province]);

  function applyPos(newLat: number, newLng: number) {
    const p: [number, number] = [newLat, newLng];
    setPos(p);
    setLatStr(newLat.toFixed(6));
    setLngStr(newLng.toFixed(6));
    onChange(newLat, newLng);
  }

  function handleLatChange(v: string) {
    setLatStr(v);
    const n = parseFloat(v);
    if (!isNaN(n)) {
      const lngN = pos ? pos[1] : parseFloat(lngStr);
      if (!isNaN(lngN)) { setPos([n, lngN]); onChange(n, lngN); setViewTarget({ center: [n, lngN], zoom: 15 }); }
    }
  }

  function handleLngChange(v: string) {
    setLngStr(v);
    const n = parseFloat(v);
    if (!isNaN(n)) {
      const latN = pos ? pos[0] : parseFloat(latStr);
      if (!isNaN(latN)) { setPos([latN, n]); onChange(latN, n); setViewTarget({ center: [latN, n], zoom: 15 }); }
    }
  }

  function handleGeolocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      applyPos(coords.latitude, coords.longitude);
      setViewTarget({ center: [coords.latitude, coords.longitude], zoom: 16 });
    }, () => {});
  }

  const initCenter: [number, number] = pos
    ?? (province && PROVINCE_COORDS[province] ? PROVINCE_COORDS[province] : [13.0, 101.5]);
  const initZoom = pos ? 14 : province && PROVINCE_COORDS[province] ? 10 : 6;

  if (!ready || !L || !RL) {
    return (
      <div className="col-span-full h-52 rounded-lg bg-background border border-border flex items-center justify-center">
        <p className="text-muted text-sm">Loading map…</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = RL;

  const markerIcon = L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;display:flex;align-items:flex-end;justify-content:center;font-size:32px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.55))">📍</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  // Sub-component: handles click + programmatic fly
  function MapController() {
    const map = useMap();
    useMapEvents({ click(e) { applyPos(e.latlng.lat, e.latlng.lng); } });
    useEffect(() => {
      if (viewTarget) {
        map.flyTo(viewTarget.center, viewTarget.zoom, { animate: true, duration: 1 });
        setViewTarget(null);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewTarget]);
    return null;
  }

  return (
    <div className="col-span-full space-y-2">
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] text-muted block mb-1">Latitude</label>
          <input
            value={latStr}
            onChange={e => handleLatChange(e.target.value)}
            placeholder="9.138200"
            className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-mono"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] text-muted block mb-1">Longitude</label>
          <input
            value={lngStr}
            onChange={e => handleLngChange(e.target.value)}
            placeholder="99.321700"
            className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent font-mono"
          />
        </div>
        <button
          type="button"
          onClick={handleGeolocate}
          className="rounded-lg bg-background border border-border px-3 py-2 text-sm hover:bg-card-hover whitespace-nowrap"
        >
          📍 ที่ตั้งปัจจุบัน
        </button>
        {pos && (
          <button
            type="button"
            onClick={() => { setPos(null); setLatStr(""); setLngStr(""); }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-danger hover:border-danger"
          >
            ✕ ล้าง
          </button>
        )}
      </div>

      <div className="relative rounded-lg overflow-hidden border border-border" style={{ height: 240 }}>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <MapContainer center={initCenter} zoom={initZoom} style={{ width: "100%", height: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          />
          <MapController />
          {pos && (
            <Marker
              position={pos}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const p = (e.target as { getLatLng: () => { lat: number; lng: number } }).getLatLng();
                  applyPos(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
        {!pos && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1000 }}>
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 text-xs text-muted border border-border shadow">
              คลิกบนแผนที่เพื่อปักหมุด หรือกรอก lat/lng ด้านบน
            </div>
          </div>
        )}
      </div>

      {pos && (
        <p className="text-[10px] text-muted">
          📌 {pos[0].toFixed(6)}, {pos[1].toFixed(6)} —{" "}
          <a
            href={`https://www.google.com/maps?q=${pos[0]},${pos[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            ดูใน Google Maps ↗
          </a>
        </p>
      )}
    </div>
  );
}
