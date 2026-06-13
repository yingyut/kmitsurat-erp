"use client";
import { useEffect, useState } from "react";
import type { Customer } from "@/lib/types";

const PROVINCE_COORDS: Record<string, [number, number]> = {
  "กรุงเทพ": [13.7563, 100.5018], "กระบี่": [8.0863, 98.9063], "กาญจนบุรี": [14.0227, 99.5328],
  "กาฬสินธุ์": [16.4322, 103.5061], "กำแพงเพชร": [16.4827, 99.5226], "ขอนแก่น": [16.4419, 102.8360],
  "จันทบุรี": [12.6113, 102.1037], "ฉะเชิงเทรา": [13.6904, 101.0779], "ชลบุรี": [13.3611, 100.9847],
  "ชัยนาท": [15.1851, 100.1251], "ชัยภูมิ": [15.8068, 102.0317], "ชุมพร": [10.4930, 99.1800],
  "เชียงราย": [19.9105, 99.8406], "เชียงใหม่": [18.7883, 98.9853], "ตรัง": [7.5563, 99.6114],
  "ตราด": [12.2428, 102.5176], "ตาก": [16.8840, 99.1258], "นครนายก": [14.2069, 101.2133],
  "นครปฐม": [13.8199, 100.0645], "นครพนม": [17.3920, 104.7695], "นครราชสีมา": [14.9799, 102.0978],
  "นครศรีธรรมราช": [8.4304, 99.9631], "นครสวรรค์": [15.7030, 100.1371], "นนทบุรี": [13.8622, 100.5144],
  "นราธิวาส": [6.4254, 101.8253], "น่าน": [18.7756, 100.7730], "บึงกาฬ": [18.3609, 103.6466],
  "บุรีรัมย์": [14.9930, 103.1029], "ปทุมธานี": [14.0208, 100.5253], "ประจวบคีรีขันธ์": [11.8126, 99.7957],
  "ปราจีนบุรี": [14.0509, 101.3717], "ปัตตานี": [6.8699, 101.2502], "พระนครศรีอยุธยา": [14.3692, 100.5877],
  "พะเยา": [19.1664, 99.9019], "พังงา": [8.4509, 98.5213], "พัทลุง": [7.6167, 100.0740],
  "พิจิตร": [16.4429, 100.3486], "พิษณุโลก": [16.8211, 100.2659], "เพชรบุรี": [13.1112, 99.9391],
  "เพชรบูรณ์": [16.4190, 101.1591], "แพร่": [18.1445, 100.1403], "ภูเก็ต": [7.8804, 98.3923],
  "มหาสารคาม": [16.1851, 103.3008], "มุกดาหาร": [16.5424, 104.7233], "แม่ฮ่องสอน": [19.3020, 97.9654],
  "ยโสธร": [15.7944, 104.1451], "ยะลา": [6.5410, 101.2803], "ร้อยเอ็ด": [16.0538, 103.6520],
  "ระนอง": [9.9529, 98.6085], "ระยอง": [12.6814, 101.2816], "ราชบุรี": [13.5283, 99.8134],
  "ลพบุรี": [14.7995, 100.6534], "ลำปาง": [18.2888, 99.4907], "ลำพูน": [18.5744, 99.0087],
  "เลย": [17.4860, 101.7223], "ศรีสะเกษ": [15.1186, 104.3220], "สกลนคร": [17.1545, 104.1348],
  "สงขลา": [7.1896, 100.5945], "สตูล": [6.6238, 100.0675], "สมุทรปราการ": [13.5991, 100.5998],
  "สมุทรสงคราม": [13.4094, 100.0023], "สมุทรสาคร": [13.5475, 100.2747], "สระแก้ว": [13.8241, 102.0645],
  "สระบุรี": [14.5289, 100.9101], "สิงห์บุรี": [14.8936, 100.3967], "สุโขทัย": [17.0076, 99.8231],
  "สุพรรณบุรี": [14.4744, 100.1177], "สุราษฎร์ธานี": [9.1382, 99.3217], "สุรินทร์": [14.8820, 103.4937],
  "หนองคาย": [17.8782, 102.7420], "หนองบัวลำภู": [17.2042, 102.4260], "อ่างทอง": [14.5896, 100.4549],
  "อำนาจเจริญ": [15.8656, 104.6258], "อุดรธานี": [17.4156, 102.7872], "อุตรดิตถ์": [17.6200, 100.0993],
  "อุทัยธานี": [15.3830, 100.0244], "อุบลราชธานี": [15.2287, 104.8564],
};

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

  // Group all customers by province
  const byProv: Record<string, Customer[]> = {};
  customers.forEach(c => {
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

          {/* Province markers */}
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
