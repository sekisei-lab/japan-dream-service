import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import hotelDataJson from '@/data/hotelData.json';
import montereyRoomsJson from '@/data/montereyRooms.json';
import areasJson from '@/data/areas.json';
import montereyInfoJson from '@/data/montereyInfo.json';
import AdminPage from './Admin';

type CityKey = string;
type PageKey =
  | 'Home'
  | 'Service'
  | 'ServiceTravel'
  | 'ServiceHotel'
  | 'ServiceGroup'
  | 'Hotels'
  | `Area:${string}`
  | `Hotel:${string}`
  | `Room:${string}`
  | 'Admin'
  | 'Contact'
  | 'MontereyBooking';

type HotelRecord = {
  city: string;
  cityLabel: string;
  name: string;
  en: string;
  stars: number;
  size: string;
  price: string;
  tax: string;
  note: string;
  address: string;
  phone?: string;
  url?: string;
  highlights?: string[];
  rooms?: { roomType: string; size?: string; occupancy?: string; note?: string; image?: string }[];
  image: string;
};

type RoomPlan = {
  id: string;
  roomType: string;
  size: string;
  occupancy: string;
  image: string;
  stock: number;
  reserved: number;
  prices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  note: string;
};

const NavContext = createContext<(page: PageKey) => void>(() => {});

const roomPage = (hotel: { en: string }): PageKey => (hotel.en === 'HOTEL MONTEREY LA SOEUR OSAKA' ? 'MontereyBooking' : (`Room:${hotel.en}` as PageKey));

const hotelPage = (hotel: { en: string }): PageKey => (hotel.en === 'HOTEL MONTEREY LA SOEUR OSAKA' ? 'MontereyBooking' : (`Hotel:${hotel.en}` as PageKey));

const colors = {
  bg: '#0E2E2A',
  green2: '#2B766A',
  gold: '#E7D8A8',
  cream: '#F6F2E8',
};

const hotelData = hotelDataJson as HotelRecord[];

const montereyRooms = montereyRoomsJson as RoomPlan[];

const accents = [
  'linear-gradient(135deg, #3A665D 0%, #1D4B44 100%)',
  'linear-gradient(135deg, #4C6A58 0%, #24463D 100%)',
  'linear-gradient(135deg, #2B6E69 0%, #194A47 100%)',
];

const areas = areasJson as { key: string; label: string; desc: string }[];

const cityMeta: Record<string, { label: string; desc: string; accent: string }> = {
  All: {
    label: '全部',
    desc: '整合旅行社资源与现有酒店信息，做成统一预览入口。',
    accent: 'linear-gradient(135deg, #274E48 0%, #143A35 100%)',
  },
  ...Object.fromEntries(areas.map((a, i) => [a.key, { label: a.label, desc: a.desc, accent: accents[i % accents.length] }])),
};

function runDataSanityChecks() {
  console.assert(hotelData.length > 0, 'hotelData should not be empty');
  console.assert(montereyRooms.length === 4, 'Monterey booking should include 4 room types');
  console.assert(montereyRooms.every((room) => room.stock >= room.reserved), 'Stock should be >= reserved');
  console.assert(hotelData.some((hotel) => hotel.en === 'HOTEL MONTEREY LA SOEUR OSAKA'), 'Monterey hotel should exist');
  console.assert(hotelData.some((hotel) => hotel.city === 'Kyoto'), 'Kyoto hotel should exist');
}
runDataSanityChecks();

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-current text-[#C7AC63]" />
      ))}
    </div>
  );
}

function HotelPreviewVisual({ city, name, image }: { city: string; name: string; image: string }) {
  return (
    <div className="relative h-40 overflow-hidden rounded-[1.7rem] border border-white/30">
      <img src={image} alt={name} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute left-4 top-4 rounded-2xl bg-white/80 px-3 py-2 text-xs font-medium text-[#173E38] backdrop-blur-sm">
        {city}
      </div>
      <div className="absolute bottom-4 left-4 right-4 rounded-[1.2rem] border border-white/40 bg-white/70 p-3 backdrop-blur-sm">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#173E38]/60">Hotel Preview</div>
        <div className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#173E38]">{name}</div>
      </div>
    </div>
  );
}

function HotelsGrid({ hotels, onOpenMonterey }: { hotels: HotelRecord[]; onOpenMonterey: () => void }) {
  const go = useContext(NavContext);
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {hotels.map((hotel, index) => {
        const isMonterey = hotel.en === 'HOTEL MONTEREY LA SOEUR OSAKA';
        return (
          <motion.div
            key={hotel.en}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.45 }}
          >
            <Card className="h-full overflow-hidden rounded-[2rem] border-[#173E38]/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="p-4">
                <HotelPreviewVisual city={hotel.city} name={hotel.name} image={hotel.image} />
              </div>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <button onClick={() => go(hotelPage(hotel))} className="text-left text-lg font-semibold leading-7 text-[#173E38] hover:underline">{hotel.name}</button>
                    <div className="mt-1 text-sm text-[#173E38]/54">{hotel.en}</div>
                  </div>
                  <div className="rounded-2xl bg-[#F7F3E8] px-3 py-2 text-xs font-medium text-[#173E38]">{hotel.cityLabel}</div>
                </div>
                <div className="mt-4">
                  <Stars count={hotel.stars} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#173E38]/72">
                  {hotel.size && <div>房型 / 面积：{hotel.size}</div>}
                  <div>价格：{hotel.price}</div>
                  {hotel.tax && <div>税费：{hotel.tax}</div>}
                  {hotel.note && <div>{hotel.note}</div>}
                  {hotel.highlights && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {hotel.highlights.map((tag) => (
                        <span key={tag} className="rounded-full bg-[#F7F3E8] px-3 py-1 text-xs text-[#173E38]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#173E38]/62">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{hotel.address}</span>
                </div>
                {hotel.phone && <div className="mt-1 text-sm text-[#173E38]/62">TEL: {hotel.phone}</div>}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    disabled={!hotel.url}
                    onClick={() => hotel.url && window.open(hotel.url, '_blank', 'noopener')}
                    className="rounded-2xl border-[#173E38]/12 bg-transparent text-[#173E38] hover:bg-[#F7F3E8] disabled:opacity-40"
                  >
                    公式サイト <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button onClick={() => go(roomPage(hotel))} className="rounded-2xl bg-[#173E38] text-white hover:bg-[#143A35]">
                    客房预览 <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function HotelsIndexPage() {
  const go = useContext(NavContext);
  return (
    <div className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2.2rem] bg-[linear-gradient(135deg,#3A665D_0%,#1D4B44_100%)] p-8 text-white shadow-2xl">
          <div className="text-xs uppercase tracking-[0.22em] text-white/58">Hotels</div>
          <h2 className="mt-3 text-4xl font-semibold">地域別ホテル一覧</h2>
          <p className="mt-4 text-sm leading-8 text-white/82 md:text-base">ホテル名をクリックすると、詳細ページへ移動します。（全 {hotelData.length} 軒）</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {areas.map((a) => {
            const list = hotelData.filter((h) => h.city === a.key);
            if (list.length === 0) return null;
            return (
              <Card key={a.key} className="rounded-[1.8rem] border-[#173E38]/10 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-baseline justify-between">
                    <button onClick={() => go(`Area:${a.key}` as PageKey)} className="text-xl font-semibold text-[#173E38] hover:underline">{a.label}</button>
                    <span className="text-xs text-[#173E38]/50">{list.length} 軒</span>
                  </div>
                  <ul className="mt-4 grid gap-2">
                    {list.map((h) => (
                      <li key={h.en}>
                        <button onClick={() => go(hotelPage(h))} className="text-left text-sm leading-6 text-[#173E38]/80 hover:text-[#173E38] hover:underline">
                          {h.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HotelDetailPage({ hotel }: { hotel: HotelRecord }) {
  const go = useContext(NavContext);
  const meta = cityMeta[hotel.city];
  const rows: [string, string | undefined][] = [
    ['エリア', hotel.cityLabel],
    ['房型 / 面积', hotel.size],
    ['价格', hotel.price],
    ['税费', hotel.tax],
    ['備考', hotel.note],
    ['住所', hotel.address],
    ['TEL', hotel.phone],
  ];
  return (
    <div className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => go('Hotels')} className="mb-4 flex items-center gap-1 text-sm text-[#173E38]/70 hover:underline">
          <ChevronRight className="h-4 w-4 rotate-180" />地域別ホテル一覧へ戻る
        </button>
        <div className="overflow-hidden rounded-[2.2rem] border border-[#173E38]/10 bg-white shadow-xl">
          <div className="relative h-64">
            <img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f2f2a]/85 via-[#0f2f2a]/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="text-xs uppercase tracking-[0.22em] text-white/58">{meta?.label}</div>
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{hotel.name}</h2>
              <div className="mt-1 text-sm text-white/75">{hotel.en}</div>
            </div>
          </div>
          <div className="p-8">
            <Stars count={hotel.stars} />
            <div className="mt-6 grid gap-3">
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid gap-1 border-b border-[#173E38]/8 pb-3 text-sm md:grid-cols-[140px_1fr]">
                    <div className="text-[#173E38]/55">{k}</div>
                    <div className="text-[#173E38]">{v}</div>
                  </div>
                ))}
            </div>
            {hotel.highlights && (
              <div className="mt-5 flex flex-wrap gap-2">
                {hotel.highlights.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#F7F3E8] px-3 py-1 text-xs text-[#173E38]">{tag}</span>
                ))}
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {hotel.url && (
                <Button variant="outline" className="rounded-2xl border-[#173E38]/12 bg-transparent px-6 text-[#173E38] hover:bg-[#F7F3E8]" onClick={() => window.open(hotel.url, '_blank', 'noopener')}>
                  公式サイト <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              <Button className="rounded-2xl bg-[#173E38] px-6 text-white hover:bg-[#143A35]" onClick={() => go(roomPage(hotel))}>
                客房预览 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomPreviewPage({ hotel }: { hotel: HotelRecord }) {
  const go = useContext(NavContext);
  const rooms = hotel.rooms && hotel.rooms.length > 0 ? hotel.rooms : [{ roomType: '標準客室', size: hotel.size, occupancy: '', note: hotel.note }];
  const [sel, setSel] = useState(0);
  const room = rooms[sel] ?? rooms[0];
  const priceRows: [string, string | undefined][] = [
    ['料金', hotel.price],
    ['税費', hotel.tax],
  ];
  const guide = [hotel.note, ...(hotel.highlights ?? [])].filter(Boolean) as string[];
  return (
    <div className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => go(hotelPage(hotel))} className="mb-4 flex items-center gap-1 text-sm text-[#173E38]/70 hover:underline">
          <ChevronRight className="h-4 w-4 rotate-180" />ホテル詳細へ戻る
        </button>
        <div className="overflow-hidden rounded-[2.4rem] border border-[#173E38]/10 bg-white shadow-xl">
          <div className="grid md:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[320px] bg-[#173E38]">
              <img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f2f2a]/85 via-[#0f2f2a]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <div className="text-xs uppercase tracking-[0.22em] text-white/58">Room Preview</div>
                <h2 className="mt-3 text-3xl font-semibold md:text-4xl">{hotel.name}</h2>
                <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-white/82">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />{hotel.cityLabel}
                  </div>
                  <Stars count={hotel.stars} />
                </div>
              </div>
            </div>
            <div className="bg-[#F9F6EE] p-8">
              <div className="text-xs uppercase tracking-[0.22em] text-[#173E38]/45">Select Room</div>
              <div className="mt-4 grid gap-3">
                {rooms.map((r, i) => {
                  const active = i === sel;
                  return (
                    <button
                      key={r.roomType}
                      onClick={() => setSel(i)}
                      className={`flex items-center justify-between rounded-[1.4rem] border px-4 py-4 text-left transition ${
                        active ? 'border-[#173E38] bg-[#173E38] text-white shadow-lg' : 'border-[#173E38]/10 bg-white text-[#173E38] hover:bg-[#F7F3E8]'
                      }`}
                    >
                      <div>
                        <div className="text-lg font-semibold">{r.roomType}</div>
                        <div className={`mt-1 text-sm ${active ? 'text-white/70' : 'text-[#173E38]/58'}`}>
                          {[r.size, r.occupancy].filter(Boolean).join(' / ') || '—'}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-[0.95fr_1.05fr]">
          <Card className="overflow-hidden rounded-[2rem] border-[#173E38]/10 bg-white shadow-sm">
            <div className="h-72 overflow-hidden">
              {room.image ? (
                <img key={room.image} src={room.image} alt={room.roomType} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#F7F3E8] text-sm text-[#173E38]/45">客室の写真は準備中です</div>
              )}
            </div>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-[#173E38]">{room.roomType}</div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-[#173E38]/64">
                    {room.occupancy && (
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />{room.occupancy}
                      </span>
                    )}
                    {room.size && <span>{room.size}</span>}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F7F3E8] px-3 py-2 text-xs font-medium text-[#173E38]">Preview</div>
              </div>
              {room.note && <p className="mt-5 text-sm leading-7 text-[#173E38]/68">{room.note}</p>}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-[#173E38]/10 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-[#173E38]/45">Pricing</div>
              <h3 className="mt-2 text-2xl font-semibold text-[#173E38]">料金・ご案内</h3>
              <div className="mt-6 grid gap-3">
                {priceRows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 rounded-2xl border border-[#173E38]/10 bg-[#FBFAF6] px-4 py-4">
                      <div className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#173E38]">{k}</div>
                      <div className="text-right text-base font-semibold text-[#173E38]">{v}</div>
                    </div>
                  ))}
              </div>
              {guide.length > 0 && (
                <div className="mt-6 rounded-[1.6rem] border border-[#173E38]/10 bg-[#FBFAF6] p-5">
                  <div className="text-sm font-semibold text-[#173E38]">ご案内</div>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#173E38]/72">
                    {guide.map((g) => (
                      <li key={g}>・{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4 rounded-[1.6rem] border border-[#173E38]/10 bg-[#F7F3E8] p-5">
                <div className="text-sm font-semibold text-[#173E38]">咨询方式栏</div>
                <div className="mt-4 grid gap-3">
                  {hotel.phone && (
                    <div className="flex items-center justify-between rounded-2xl border border-[#173E38]/10 bg-white px-4 py-4">
                      <div className="text-sm font-medium text-[#173E38]">电话咨询</div>
                      <div className="text-sm text-[#173E38]/68">{hotel.phone}</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-2xl border border-[#173E38]/10 bg-white px-4 py-4">
                    <div className="text-sm font-medium text-[#173E38]">邮件咨询</div>
                    <div className="text-sm text-[#173E38]/68">info@japandreamservice.jp</div>
                  </div>
                  {hotel.url && (
                    <button onClick={() => window.open(hotel.url, '_blank', 'noopener')} className="flex items-center justify-between rounded-2xl border border-[#173E38]/10 bg-white px-4 py-4 text-left hover:bg-[#F7F3E8]">
                      <div className="text-sm font-medium text-[#173E38]">公式サイト</div>
                      <ArrowRight className="h-4 w-4 text-[#173E38]/68" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ServicePage({ title }: { title?: string }) {
  const pageTitle = title ?? 'Service';
  return (
    <div className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2.2rem] bg-[linear-gradient(135deg,#3A665D_0%,#1D4B44_100%)] p-8 text-white shadow-2xl">
          <div className="text-xs uppercase tracking-[0.22em] text-white/58">Service Page</div>
          <h2 className="mt-3 text-4xl font-semibold">{pageTitle}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/82 md:text-base">
            这里是 {pageTitle} 的独立页面。可以继续扩展真实服务介绍、流程与咨询入口。
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {['Travel Planning', 'Hotel Arrangement', 'Group Support'].map((item) => (
            <Card key={item} className="rounded-[1.8rem] border-[#173E38]/10 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="text-lg font-semibold text-[#173E38]">{item}</div>
                <div className="mt-3 text-sm leading-7 text-[#173E38]/65">这里可以继续替换成正式的服务介绍文案。</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function CityPage({ city, hotels, onOpenMonterey }: { city: string; hotels: HotelRecord[]; onOpenMonterey: () => void }) {
  const meta = cityMeta[city];
  return (
    <div className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2.2rem] p-8 text-white shadow-2xl" style={{ background: meta.accent }}>
          <div className="text-xs uppercase tracking-[0.22em] text-white/58">Destination Page</div>
          <h2 className="mt-3 text-4xl font-semibold">{meta.label}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/82 md:text-base">{meta.desc}</p>
        </div>
        <div className="mt-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[#173E38]/45">Hotels in {meta.label}</div>
              <h3 className="mt-2 text-3xl font-semibold text-[#173E38]">{meta.label} 酒店列表</h3>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[#173E38] ring-1 ring-[#173E38]/10">共 {hotels.length} 家</div>
          </div>
          <HotelsGrid hotels={hotels} onOpenMonterey={onOpenMonterey} />
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  return (
    <section className="px-6 py-16 md:px-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-[#173E38]/10 bg-[linear-gradient(135deg,#143A35_0%,#1C5A51_100%)] text-white shadow-2xl">
        <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:py-12">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/55">Contact</div>
            <h3 className="mt-3 text-3xl font-semibold md:text-4xl">联系与下一步</h3>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/78 md:text-base">
              Menu 已调整为 Home / Service / Hotels / Contact。Hotels 下有 Osaka / Kyoto / Tokyo。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MontereyBookingPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const [selectedRoom, setSelectedRoom] = useState<string>('single');
  const selected = montereyRooms.find((room) => room.id === selectedRoom) ?? montereyRooms[0];

  return (
    <div className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.4rem] border border-[#173E38]/10 bg-white shadow-xl">
          <div className="grid md:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[320px] bg-[#173E38]">
              <img src="https://images.unsplash.com/photo-1445019980597-93fa8acb246c?q=80&w=1600" alt="Hotel Monterey La Soeur Osaka" className="h-full w-full object-cover opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f2f2a]/85 via-[#0f2f2a]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <div className="text-xs uppercase tracking-[0.22em] text-white/58">Room Reservation Preview</div>
                <h2 className="mt-3 text-4xl font-semibold">ホテルモントレ ラ・スール大阪</h2>
                <div className="mt-4 flex items-center gap-5 text-sm text-white/82">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />京橋駅 徒歩約5分
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />朝食付き
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#F9F6EE] p-8">
              <div className="text-xs uppercase tracking-[0.22em] text-[#173E38]/45">Select Room</div>
              <div className="mt-4 grid gap-3">
                {montereyRooms.map((room) => {
                  const active = room.id === selectedRoom;
                  return (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room.id)}
                      className={`flex items-center justify-between rounded-[1.4rem] border px-4 py-4 text-left transition ${
                        active ? 'border-[#173E38] bg-[#173E38] text-white shadow-lg' : 'border-[#173E38]/10 bg-white text-[#173E38] hover:bg-[#F7F3E8]'
                      }`}
                    >
                      <div>
                        <div className="text-lg font-semibold">{room.roomType}</div>
                        <div className={`mt-1 text-sm ${active ? 'text-white/70' : 'text-[#173E38]/58'}`}>
                          {room.size} / {room.occupancy}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-[0.95fr_1.05fr]">
          <Card className="overflow-hidden rounded-[2rem] border-[#173E38]/10 bg-white shadow-sm">
            <div className="h-72 overflow-hidden">
              <img src={selected.image} alt={selected.roomType} className="h-full w-full object-cover" />
            </div>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-[#173E38]">{selected.roomType}</div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-[#173E38]/64">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />{selected.occupancy}
                    </span>
                    <span>{selected.size}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F7F3E8] px-3 py-2 text-xs font-medium text-[#173E38]">Preview</div>
              </div>
              <p className="mt-5 text-sm leading-7 text-[#173E38]/68">{selected.note}</p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-[#173E38]/10 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-[#173E38]/45">Pricing Table</div>
              <h3 className="mt-2 text-2xl font-semibold text-[#173E38]">客房预约画面</h3>
              <div className="mt-6 grid gap-3">
                {Object.entries(selected.prices).map(([season, price]) => (
                  <div key={season} className="flex items-center justify-between rounded-2xl border border-[#173E38]/10 bg-[#FBFAF6] px-4 py-4">
                    <div>
                      <div className="text-lg font-semibold text-[#173E38]">区分 {season}</div>
                      <div className="text-sm text-[#173E38]/58">1名 / 1泊朝食付き</div>
                    </div>
                    <div className="text-xl font-semibold text-[#173E38]">{price}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs leading-6 text-[#173E38]/58">{montereyInfoJson.basis}</div>
              <div className="mt-6 rounded-[1.6rem] border border-[#173E38]/10 bg-[#FBFAF6] p-5">
                <div className="text-sm font-semibold text-[#173E38]">ご案内</div>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#173E38]/72">
                  {montereyInfoJson.notes.map((n) => (
                    <li key={n}>・{n}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded-[1.6rem] border border-[#173E38]/10 bg-[#FBFAF6] p-5">
                <div className="text-sm font-semibold text-[#173E38]">キャンセルポリシー</div>
                <div className="mt-3 grid gap-2 text-sm text-[#173E38]/72">
                  {montereyInfoJson.cancel.map(([when, fee]) => (
                    <div key={when} className="flex items-center justify-between border-b border-[#173E38]/8 pb-2 last:border-0 last:pb-0">
                      <span>{when}</span>
                      <span className="font-medium text-[#173E38]">{fee}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-[1.6rem] border border-[#173E38]/10 bg-[#F7F3E8] p-5">
                <div className="text-sm font-semibold text-[#173E38]">咨询方式栏</div>
                <div className="mt-4 grid gap-3">
                  {[
                    ['电话咨询', '+81 00-0000-0000'],
                    ['邮件咨询', 'info@japandreamservice.jp'],
                    ['微信 / LINE', '可在正式版中接入'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-[#173E38]/10 bg-white px-4 py-4">
                      <div className="text-sm font-medium text-[#173E38]">{label}</div>
                      <div className="text-sm text-[#173E38]/68">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HomeOrHotelsPage({
  mode,
  heroText,
  query,
  setQuery,
  activeCity,
  setActiveCity,
  filteredHotels,
  onOpenMonterey,
  onGoHotels,
  onGoService,
  hotelPreviewRef,
}: {
  mode: 'Home' | 'Hotels';
  heroText: { label: string; desc: string; accent: string };
  query: string;
  setQuery: (value: string) => void;
  activeCity: CityKey;
  setActiveCity: (value: CityKey) => void;
  filteredHotels: HotelRecord[];
  onOpenMonterey: () => void;
  onGoHotels: () => void;
  onGoService: () => void;
  hotelPreviewRef: React.RefObject<HTMLElement>;
}) {
  const isHotels = mode === 'Hotels';

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#103631_0%,#1D5B52_55%,#275A52_100%)]" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
        <div className="absolute -left-12 top-20 h-48 w-48 rounded-full bg-[#E7D8A8]/10 blur-3xl" />
        <div className="absolute right-0 top-12 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:py-24">
          <div className="text-white">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85 }} className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs tracking-[0.18em] text-white/82">
              <Sparkles className="h-4 w-4" />
              JAPAN DREAM SERVICE
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.95 }} className="mt-7 text-4xl font-semibold leading-tight md:text-6xl">
              {isHotels ? 'Hotels 预览入口' : '日本旅游服务信息'}
              <br />
              {isHotels ? '向下查看酒店列表' : '一目でわかる展示入口'}
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 1 }} className="mt-6 max-w-xl text-base leading-8 text-white/82">
              {isHotels
                ? 'Hotels 页面不再显示额外按钮，中间下方放置呼吸式向下箭头。点击后会平滑滑入到下方的酒店预览区。'
                : '首页右侧作为特价优惠区，左侧主按钮调整为【去Hotels】【去Service】。'}
            </motion.p>
            {!isHotels && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.9 }} className="mt-8 flex flex-wrap gap-4">
                <Button className="rounded-2xl px-6 text-[#173E38]" style={{ backgroundColor: colors.cream }} onClick={onGoHotels}>
                  去Hotels
                </Button>
                <Button variant="outline" className="rounded-2xl border-white/24 bg-transparent px-6 text-white hover:bg-white/10" onClick={onGoService}>
                  去Service
                </Button>
              </motion.div>
            )}
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.35, duration: 1 }}>
            <Card className="overflow-hidden rounded-[2.2rem] border-white/12 bg-white/96 shadow-2xl">
              <CardContent className="p-0">
                <div className="border-b border-[#173E38]/8 bg-[#F7F3E8] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#173E38]/45">{isHotels ? 'Hotels Overview' : 'Special Offers'}</div>
                  <div className="mt-2 text-2xl font-semibold text-[#173E38]">{isHotels ? `${heroText.label} 资源预览` : '特价区 / 优惠区'}</div>
                  <div className="mt-2 text-sm leading-7 text-[#173E38]/62">{isHotels ? heroText.desc : '适合作为首页右侧重点推荐区，展示限时优惠、团体住宿特价与热门推荐。'}</div>
                </div>
                <div className="p-5">
                  {isHotels ? (
                    <div className="rounded-[1.8rem] p-4 text-white" style={{ background: heroText.accent }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-white/58">Current Selection</div>
                          <div className="mt-2 text-2xl font-semibold">{heroText.label}</div>
                        </div>
                        <div className="rounded-2xl border border-white/16 bg-white/10 px-3 py-2 text-xs">Hotels View</div>
                      </div>
                      <div className="mt-6 grid gap-3">
                        {filteredHotels.slice(0, 3).map((hotel) => (
                          <div key={hotel.en} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                            <div className="text-sm font-semibold">{hotel.name}</div>
                            <div className="mt-1 text-xs text-white/65">{hotel.en}</div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/78">
                              <span>{hotel.size}</span>
                              <span>{hotel.price}</span>
                              <span>{hotel.note}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {[
                        ['大阪限定', 'HOTEL MONTEREY LA SOEUR OSAKA', '朝食付き / 温浴设施利用可'],
                        ['京都推荐', 'hotel MONday 京都烏丸二条', '和现代风格 / 市区动线便利'],
                        ['东京精选', 'hotel MONday Premium TOYOSU', '家庭与团队入住推荐'],
                      ].map(([tag, title, desc]) => (
                        <div key={title} className="rounded-[1.6rem] border border-[#173E38]/10 bg-[#FBFAF6] p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-[#173E38]/45">{tag}</div>
                          <div className="mt-2 text-lg font-semibold text-[#173E38]">{title}</div>
                          <div className="mt-2 text-sm leading-6 text-[#173E38]/62">{desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {isHotels && (
        <section className="relative flex justify-center bg-white/55 pt-2 pb-4">
          <motion.button
            onClick={() => hotelPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            animate={{ y: [0, 12, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="group flex flex-col items-center text-[#173E38]"
            aria-label="Scroll to hotel preview"
          >
            <span className="mb-2 text-xs uppercase tracking-[0.22em] text-[#173E38]/45">Scroll Down</span>
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#173E38]/15 bg-white shadow-lg">
              <ArrowDown className="h-8 w-8 transition group-hover:translate-y-1" />
            </span>
          </motion.button>
        </section>
      )}

      <section ref={hotelPreviewRef} className="border-y border-[#173E38]/8 bg-white/55">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[#173E38]/45">Hotels</div>
              <h3 className="mt-3 text-3xl font-semibold text-[#173E38] md:text-4xl">Home 页面预览酒店</h3>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-[#173E38]/68 md:text-base">这里保留总览区。点击 ホテルモントレ ラ・スール大阪 的按钮，会进入客房预约画面。</p>
            </div>
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#173E38]/45" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索酒店或城市" className="h-12 rounded-2xl border-[#173E38]/10 bg-white pl-10" />
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {['All', ...areas.map((a) => a.key)].map((city) => (
              <button key={city} onClick={() => setActiveCity(city)} className={`rounded-2xl px-4 py-3 text-sm transition ${activeCity === city ? 'bg-[#173E38] text-white shadow' : 'bg-white text-[#173E38]/72 ring-1 ring-[#173E38]/10 hover:bg-[#F7F3E8]'}`}>
                {cityMeta[city].label}
              </button>
            ))}
          </div>
          <div className="mt-10">
            <HotelsGrid hotels={filteredHotels} onOpenMonterey={onOpenMonterey} />
          </div>
        </div>
      </section>
    </>
  );
}

export default function JapanDreamServicePrototype() {
  const hotelPreviewRef = useRef<HTMLElement>(null);
  const [showSplash, setShowSplash] = useState(() => window.location.hash !== '#Admin');
  const [activeCity, setActiveCity] = useState<CityKey>('All');
  const readHash = (): PageKey => {
    try {
      const h = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      return (h || 'Home') as PageKey;
    } catch {
      return 'Home';
    }
  };
  const [activePage, setActivePage] = useState<PageKey>(readHash);

  useEffect(() => {
    const onPop = () => setActivePage(readHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredHotels = useMemo(() => {
    return hotelData.filter((hotel) => {
      const cityMatch = activeCity === 'All' || hotel.city === activeCity;
      const q = query.trim().toLowerCase();
      const queryMatch =
        q === '' ||
        hotel.name.toLowerCase().includes(q) ||
        hotel.en.toLowerCase().includes(q) ||
        hotel.city.toLowerCase().includes(q) ||
        hotel.cityLabel.toLowerCase().includes(q);
      return cityMatch && queryMatch;
    });
  }, [activeCity, query]);

  const heroText = cityMeta[activeCity];

  const goPage = (page: PageKey) => {
    setActivePage(page);
    window.history.pushState(null, '', page === 'Home' ? window.location.pathname : `#${encodeURIComponent(page)}`);
  };

  const goHotelsPreview = () => {
    goPage('Hotels');
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activePage]);

  const renderPage = () => {
    if (activePage.startsWith('Room:')) {
      const hotel = hotelData.find((h) => h.en === activePage.slice(5));
      return hotel ? <RoomPreviewPage hotel={hotel} key={hotel.en} /> : <HotelsIndexPage />;
    }
    if (activePage.startsWith('Hotel:')) {
      const hotel = hotelData.find((h) => h.en === activePage.slice(6));
      return hotel ? <HotelDetailPage hotel={hotel} /> : <HotelsIndexPage />;
    }
    if (activePage.startsWith('Area:')) {
      const key = activePage.slice(5);
      return <CityPage city={key} hotels={hotelData.filter((hotel) => hotel.city === key)} onOpenMonterey={() => goPage('MontereyBooking')} />;
    }
    switch (activePage) {
      case 'Service':
        return <ServicePage title="Service Overview" />;
      case 'ServiceTravel':
        return <ServicePage title="Travel Planning" />;
      case 'ServiceHotel':
        return <ServicePage title="Hotel Arrangement" />;
      case 'ServiceGroup':
        return <ServicePage title="Group Support" />;
      case 'Contact':
        return <ContactPage />;
      case 'MontereyBooking':
        return <MontereyBookingPage />;
      case 'Hotels':
        return <HotelsIndexPage />;
      case 'Home':
      default:
        return (
          <HomeOrHotelsPage
            mode="Home"
            heroText={heroText}
            query={query}
            setQuery={setQuery}
            activeCity={activeCity}
            setActiveCity={setActiveCity}
            filteredHotels={filteredHotels}
            onOpenMonterey={() => goPage('MontereyBooking')}
            onGoHotels={goHotelsPreview}
            onGoService={() => goPage('Service')}
            hotelPreviewRef={hotelPreviewRef}
          />
        );
    }
  };

  if (activePage === 'Admin') {
    return (
      <div className="min-h-screen bg-[#F6F2E8] text-[#173E38]">
        <AdminPage />
      </div>
    );
  }

  return (
    <NavContext.Provider value={goPage}>
    <div className="min-h-screen bg-[#F6F2E8] text-[#173E38]">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.section
            key="splash"
            className="fixed inset-0 z-50 overflow-hidden"
            style={{ background: `radial-gradient(circle at 50% 20%, ${colors.green2} 0%, ${colors.bg} 65%)` }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, transition: { duration: 2.2 } }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: [0.2, 0.42, 0.2] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                backgroundImage:
                  'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16), transparent 18%), radial-gradient(circle at 70% 45%, rgba(255,255,255,0.11), transparent 20%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: 'auto, auto, 40px 40px, 40px 40px',
              }}
            />
            <div className="relative flex min-h-screen items-center justify-center px-6">
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, y: 22 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 1.9, ease: [0.22, 1, 0.36, 1] }}
                  className="relative mx-auto w-fit"
                >
                  <div className="absolute inset-0 rounded-full bg-[#E7D8A8]/18 blur-3xl" />
                  <div className="relative text-[9rem] leading-none text-[#F6EDCF] md:text-[12rem]">∞</div>
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 1.4 }}
                  className="mt-3 text-3xl font-semibold tracking-wide text-[#F8F4E2] md:text-5xl"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Japan Dream Service
                </motion.h1>
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.div key={activePage} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.55 }}>
            <header className="sticky top-0 z-40 border-b border-[#173E38]/8 bg-[#F6F2E8]/80 backdrop-blur-xl">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
                <button className="flex items-center gap-3 text-left" onClick={() => goPage('Home')}>
                  <div className="text-4xl leading-none text-[#C9B06B]">∞</div>
                  <div>
                    <div className="text-base font-semibold" style={{ fontFamily: 'Georgia, serif' }}>Japan Dream Service</div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#173E38]/48">Travel Preview</div>
                  </div>
                </button>
                <nav className="hidden items-center gap-2 md:flex">
                  <button onClick={() => goPage('Home')} className={`rounded-2xl px-4 py-2 text-sm transition ${activePage === 'Home' ? 'bg-[#173E38] text-white shadow' : 'text-[#173E38]/72 hover:bg-white hover:text-[#173E38]'}`}>
                    Home
                  </button>
                  <div className="group relative">
                    <button onClick={() => goPage('Service')} className={`flex items-center gap-1 rounded-2xl px-4 py-2 text-sm transition ${activePage === 'Service' ? 'bg-[#173E38] text-white shadow' : 'text-[#173E38]/72 hover:bg-white hover:text-[#173E38]'}`}>
                      Service <ChevronDown className="h-4 w-4" />
                    </button>
                    <div className="invisible absolute left-0 top-12 z-20 w-64 rounded-2xl border border-[#173E38]/10 bg-white p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      <button onClick={() => goPage('ServiceTravel')} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F3E8]">Travel Planning</button>
                      <button onClick={() => goPage('ServiceHotel')} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F3E8]">Hotel Arrangement</button>
                      <button onClick={() => goPage('ServiceGroup')} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F3E8]">Group Support</button>
                    </div>
                  </div>
                  <div className="group relative">
                    <button onClick={goHotelsPreview} className={`flex items-center gap-1 rounded-2xl px-4 py-2 text-sm transition ${activePage === 'Hotels' ? 'bg-[#173E38] text-white shadow' : 'text-[#173E38]/72 hover:bg-white hover:text-[#173E38]'}`}>
                      Hotels <ChevronDown className="h-4 w-4" />
                    </button>
                    <div className="invisible absolute left-0 top-12 z-20 max-h-[70vh] w-56 overflow-y-auto rounded-2xl border border-[#173E38]/10 bg-white p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      {areas.map((a) => (
                        <button key={a.key} onClick={() => goPage(`Area:${a.key}` as PageKey)} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#F7F3E8]">{a.label}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => goPage('Contact')} className={`rounded-2xl px-4 py-2 text-sm transition ${activePage === 'Contact' ? 'bg-[#173E38] text-white shadow' : 'text-[#173E38]/72 hover:bg-white hover:text-[#173E38]'}`}>
                    Contact
                  </button>
                </nav>
              </div>
            </header>
            <main>{renderPage()}</main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </NavContext.Provider>
  );
}
