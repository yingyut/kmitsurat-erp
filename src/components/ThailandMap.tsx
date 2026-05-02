"use client";
import { useEffect, useState } from "react";
import type { Customer } from "@/lib/types";

// Province coordinates (lat, lng)
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

interface Props {
  customers: Customer[];
  selectedProvince: string;
  onSelectProvince: (p: string) => void;
  getCustomerSummary: (c: Customer) => { projects: number; totalValue: number; quotations: number; quotValue: number; serviceTotal: number; pmJobs: number; openJobs: number };
}

export default function ThailandMap({ customers, selectedProvince, onSelectProvince, getCustomerSummary }: Props) {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [RL, setRL] = useState<typeof import("react-leaflet") | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([import("leaflet"), import("react-leaflet")]).then(([leaflet, reactLeaflet]) => {
      setL(leaflet);
      setRL(reactLeaflet);

      // Fix default marker icon
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      setReady(true);
    });
  }, []);

  if (!ready || !L || !RL) return <div className="h-[500px] rounded-xl bg-card border border-border flex items-center justify-center"><p className="text-muted text-sm">Loading map...</p></div>;

  const { MapContainer, TileLayer, CircleMarker, Popup } = RL;

  // Group customers by province
  const byProvince: Record<string, Customer[]> = {};
  customers.forEach(c => {
    if (c.province && PROVINCE_COORDS[c.province]) {
      if (!byProvince[c.province]) byProvince[c.province] = [];
      byProvince[c.province].push(c);
    }
  });

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-semibold" title="แผนที่ลูกค้าตามจังหวัด">Customer Map</h3>
          <p className="text-[10px] text-muted">แผนที่แสดงตำแหน่งลูกค้าตามจังหวัด — ซูมได้ คลิกจุดเพื่อดูรายละเอียด</p>
        </div>
        <MapContainer
          center={[13.0, 101.0]}
          zoom={6}
          style={{ height: 500, width: "100%", background: "#0f172a" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {Object.entries(byProvince).map(([prov, custs]) => {
            const coords = PROVINCE_COORDS[prov];
            if (!coords) return null;
            const count = custs.length;
            const color = count >= 3 ? "#f43f5e" : count >= 2 ? "#f59e0b" : "#3b82f6";
            const radius = Math.min(8 + count * 4, 20);

            return (
              <CircleMarker
                key={prov}
                center={coords}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
                eventHandlers={{ click: () => onSelectProvince(selectedProvince === prov ? "all" : prov) }}
              >
                <Popup>
                  <div style={{ minWidth: 220, color: "#e2e8f0", background: "#1e293b", margin: -12, padding: 12, borderRadius: 8 }}>
                    <p style={{ fontWeight: "bold", fontSize: 14, marginBottom: 8 }}>{prov} ({count} ลูกค้า)</p>
                    {custs.map(c => {
                      const s = getCustomerSummary(c);
                      return (
                        <div key={c.id} style={{ borderBottom: "1px solid #334155", paddingBottom: 6, marginBottom: 6 }}>
                          <p style={{ fontWeight: 600, fontSize: 12 }}>{c.company_name}</p>
                          <p style={{ fontSize: 10, color: "#94a3b8" }}>{c.contact_name} · {c.phone}</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4, fontSize: 10 }}>
                            <span>โปรเจค: <b>{s.projects}</b></span>
                            <span style={{ color: "#22c55e" }}>มูลค่า: <b>{s.totalValue.toLocaleString()}</b></span>
                            <span>ใบเสนอราคา: <b>{s.quotations}</b></span>
                            <span>PM/MA: <b style={{ color: "#f59e0b" }}>{s.pmJobs}</b></span>
                            <span>งานบริการ: <b>{s.serviceTotal}</b></span>
                            <span>งานค้าง: <b style={{ color: s.openJobs > 0 ? "#f43f5e" : "#22c55e" }}>{s.openJobs}</b></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}
