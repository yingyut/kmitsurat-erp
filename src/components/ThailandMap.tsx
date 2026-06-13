"use client";
import { useEffect, useState } from "react";
import type { Customer } from "@/lib/types";
import { PROVINCE_COORDS } from "@/lib/thailand-coords";


const HQ: [number, number] = [9.1382, 99.3217]; // KMITSURAT สุราษฎร์ธานี

interface CustomerSummary {
  projects: number; totalValue: number; quotations: number; quotValue: number;
  serviceTotal: number; pmJobs: number; openJobs: number; lastContactDays: number | null;
}

interface Props {
  customers: Customer[];
  myCustomers: Customer[];
  selectedProvince: string;
  onSelectProvince: (p: string) => void;
  getCustomerSummary: (c: Customer) => CustomerSummary;
}

function freshnessPct(days: number | null): number {
  if (days === null) return 60; // no data — neutral
  return Math.max(0, Math.round((1 - Math.min(days, 365) / 365) * 100));
}
function freshnessCol(pct: number): string {
  if (pct >= 67) return "#22c55e";
  if (pct >= 34) return "#f59e0b";
  if (pct > 0)   return "#ef4444";
  return "#9ca3af";
}

export default function ThailandMap({ customers, myCustomers, selectedProvince, onSelectProvince, getCustomerSummary }: Props) {
  const [L,   setL]   = useState<typeof import("leaflet") | null>(null);
  const [RL,  setRL]  = useState<typeof import("react-leaflet") | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([import("leaflet"), import("react-leaflet")]).then(([leaflet, rl]) => {
      setL(leaflet); setRL(rl); setReady(true);
    });
  }, []);

  if (!ready || !L || !RL) return (
    <div className="h-[520px] rounded-xl bg-card border border-border flex items-center justify-center">
      <p className="text-muted text-sm">Loading map…</p>
    </div>
  );

  const { MapContainer, TileLayer, Marker, Polyline, Popup } = RL;

  // Split: exact-pin customers vs province-only
  const pinnedCustomers = customers.filter(c => c.lat != null && c.lng != null);
  const pinnedIds = new Set(pinnedCustomers.map(c => c.id));

  const byProv: Record<string, Customer[]> = {};
  customers.forEach(c => {
    if (pinnedIds.has(c.id)) return; // shown as individual pin
    if (c.province && PROVINCE_COORDS[c.province]) {
      (byProv[c.province] ??= []).push(c);
    }
  });

  // Provinces that have at least 1 of MY customers (for lines)
  const myProvs = new Set(myCustomers.map(c => c.province).filter(p => p && PROVINCE_COORDS[p!]));

  // HQ icon
  const hqIcon = L.divIcon({
    className: "",
    html: `<div style="width:38px;height:38px;background:#1d4ed8;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 12px rgba(29,78,216,.55);">🏢</div>`,
    iconSize: [38, 38], iconAnchor: [19, 19],
  });

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <style>{`
        .kmit-flow { animation: kmitDash 1.3s linear infinite; }
        @keyframes kmitDash { to { stroke-dashoffset: -20; } }
        .leaflet-popup-content-wrapper { border-radius: 10px !important; padding: 0 !important; overflow: hidden; }
        .leaflet-popup-content { margin: 0 !important; }
      `}</style>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Customer Map</h3>
            <p className="text-[10px] text-muted">เส้นสีน้ำเงิน = ลูกค้าของฉัน · แถบใต้ไอคอน = ความสดของการติดต่อ (เขียว=ล่าสุด, แดง=เกิน 1 ปี)</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span><span style={{color:"#22c55e"}}>●</span> &lt; 4 เดือน</span>
            <span><span style={{color:"#f59e0b"}}>●</span> 4–8 เดือน</span>
            <span><span style={{color:"#ef4444"}}>●</span> 8–12 เดือน</span>
            <span><span style={{color:"#9ca3af"}}>●</span> 1 ปี+</span>
          </div>
        </div>

        <MapContainer center={[13.0, 101.0]} zoom={6}
          style={{ height: 520, width: "100%", background: "#e8f0fe" }}
          scrollWheelZoom>
          {/* Google-like Voyager tile */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* HQ marker */}
          <Marker position={HQ} icon={hqIcon}>
            <Popup>
              <div style={{ padding: "10px 14px", minWidth: 160 }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>🏢 KMITSURAT HQ</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>สุราษฎร์ธานี · ศูนย์กลางการขาย</p>
              </div>
            </Popup>
          </Marker>

          {/* Animated lines: HQ → my-customer provinces */}
          {[...myProvs].map(prov => {
            const coords = PROVINCE_COORDS[prov!];
            if (!coords) return null;
            return (
              <Polyline key={`line-${prov}`}
                positions={[HQ, coords]}
                pathOptions={{ color: "#3b82f6", weight: 2.5, opacity: 0.75, dashArray: "10 8", className: "kmit-flow" }}
              />
            );
          })}

          {/* Individual exact-position pins */}
          {pinnedCustomers.map(c => {
            const s = getCustomerSummary(c);
            const fp = freshnessPct(s.lastContactDays);
            const fc = freshnessCol(fp);
            const pinIcon = L.divIcon({
              className: "",
              html: `<div style="display:flex;flex-direction:column;align-items:center">
                <div style="background:${fc};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis">${c.company_name}</div>
                <div style="width:2px;height:6px;background:${fc}"></div>
                <div style="width:8px;height:8px;background:${fc};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>
              </div>`,
              iconSize: [120, 36],
              iconAnchor: [60, 36],
            });
            const dayLabel = s.lastContactDays === null ? "ไม่มีข้อมูล"
              : s.lastContactDays === 0 ? "วันนี้"
              : s.lastContactDays < 30 ? `${s.lastContactDays} วัน`
              : s.lastContactDays < 365 ? `${Math.round(s.lastContactDays / 30)} เดือน`
              : `${(s.lastContactDays / 365).toFixed(1)} ปี`;
            return (
              <Marker key={c.id} position={[c.lat!, c.lng!]} icon={pinIcon}>
                <Popup>
                  <div style={{ minWidth: 200, fontFamily: "sans-serif", padding: "10px 14px" }}>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>{c.company_name}</p>
                    {c.contact_name && <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 2px" }}>{c.contact_name} {c.phone ? `· ${c.phone}` : ""}</p>}
                    {c.address && <p style={{ fontSize: 10, color: "#94a3b8", margin: "0 0 6px" }}>{c.address}</p>}
                    <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#475569", flexWrap: "wrap" }}>
                      {s.projects > 0 && <span>📁 {s.projects} โปรเจค</span>}
                      {s.quotations > 0 && <span>📋 {s.quotations} ใบเสนอ</span>}
                      {s.openJobs > 0 && <span style={{ color: "#ef4444" }}>⚠ {s.openJobs} งานค้าง</span>}
                      {s.totalValue > 0 && <span style={{ color: "#22c55e" }}>฿{(s.totalValue / 1000).toFixed(0)}K</span>}
                    </div>
                    <p style={{ fontSize: 10, color: fc, fontWeight: 600, marginTop: 4 }}>● ติดต่อล่าสุด {dayLabel}</p>
                    <a href={`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: "#3b82f6", display: "block", marginTop: 4 }}>ดูใน Google Maps ↗</a>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Province cluster markers (customers without exact pin) */}
          {Object.entries(byProv).map(([prov, custs]) => {
            const coords = PROVINCE_COORDS[prov];
            if (!coords) return null;
            const count = custs.length;

            // worst freshness in this province (triggers alert if any customer is stale)
            const sums = custs.map(c => getCustomerSummary(c));
            const fpcts = sums.map(s => freshnessPct(s.lastContactDays));
            const minFp = Math.min(...fpcts);
            const fCol  = freshnessCol(minFp);
            const sz    = Math.min(26 + count * 4, 46);

            const icon = L.divIcon({
              className: "",
              html: `
                <div style="position:relative;width:${sz}px;height:${sz+10}px;text-align:center">
                  <div style="
                    width:${sz}px;height:${sz}px;
                    background:${fCol};
                    border-radius:50%;
                    border:2.5px solid #fff;
                    display:flex;align-items:center;justify-content:center;
                    color:#fff;font-weight:700;font-size:${count>9?10:12}px;
                    box-shadow:0 2px 10px rgba(0,0,0,0.22);
                    cursor:pointer;
                  ">${count}</div>
                  <div style="margin:3px auto 0;width:${sz-6}px;height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                    <div style="width:${minFp}%;height:100%;background:${fCol};border-radius:3px;"></div>
                  </div>
                </div>`,
              iconSize: [sz, sz + 10],
              iconAnchor: [sz / 2, sz / 2 + 5],
            });

            return (
              <Marker key={prov} position={coords} icon={icon}
                eventHandlers={{ click: () => onSelectProvince(selectedProvince === prov ? "all" : prov) }}>
                <Popup>
                  <div style={{ minWidth: 230, fontFamily: "sans-serif" }}>
                    <div style={{ background: "#f8fafc", padding: "8px 14px 6px", borderBottom: "1px solid #e2e8f0" }}>
                      <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{prov} · {count} ลูกค้า</p>
                    </div>
                    <div style={{ padding: "6px 0", maxHeight: 260, overflowY: "auto" }}>
                      {custs.map((c, i) => {
                        const s = sums[i];
                        const fp = fpcts[i];
                        const fc = freshnessCol(fp);
                        const dayLabel = s.lastContactDays === null ? "ไม่มีข้อมูล"
                          : s.lastContactDays === 0 ? "วันนี้"
                          : s.lastContactDays < 30 ? `${s.lastContactDays} วัน`
                          : s.lastContactDays < 365 ? `${Math.round(s.lastContactDays/30)} เดือน`
                          : `${(s.lastContactDays/365).toFixed(1)} ปี`;
                        return (
                          <div key={c.id} style={{ padding: "5px 14px", borderBottom: i < custs.length-1 ? "1px solid #f1f5f9" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                              <p style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>{c.company_name}</p>
                              <span style={{ fontSize: 10, color: fc, fontWeight: 600 }}>● {dayLabel}</span>
                            </div>
                            <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 3px" }}>{c.contact_name} {c.phone ? `· ${c.phone}` : ""}</p>
                            <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#475569" }}>
                              {s.projects > 0 && <span>📁 {s.projects}</span>}
                              {s.quotations > 0 && <span>📋 {s.quotations}</span>}
                              {s.openJobs > 0 && <span style={{ color: "#ef4444" }}>⚠ {s.openJobs}</span>}
                              {s.totalValue > 0 && <span style={{ color: "#22c55e" }}>฿{(s.totalValue/1000).toFixed(0)}K</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}
