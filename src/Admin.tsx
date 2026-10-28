import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import areasJson from '@/data/areas.json';

const REPO = 'sekisei-lab/japan-dream-service';
const BRANCH = 'main';
const DATA_PATH = 'src/data/hotelData.json';
const CONTACT_PATH = 'src/data/contact.json';
const TOKEN_KEY = 'jds_admin_token';

type Room = { roomType: string; size?: string; occupancy?: string; note?: string; image?: string };
type Hotel = {
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
  rooms?: Room[];
  image: string;
};
type Qr = { label: string; image: string };
type Contact = { qrs?: Qr[]; label: string; title: string; message: string; phone: string; email: string; chat: string; address: string; hours: string };
type Pending = { path: string; base64: string; preview: string };

const areas = areasJson as { key: string; label: string; desc: string }[];
const PLACEHOLDER = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200';

const utf8ToB64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};
const b64ToUtf8 = (b64: string) => {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      msg += ` ${(await res.json()).message}`;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

async function resizeToJpegBase64(file: File, maxW = 1200, mime = 'image/jpeg'): Promise<{ base64: string; preview: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL(mime, 0.85);
  return { base64: dataUrl.split(',')[1], preview: dataUrl };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hotel';

const inputCls = 'w-full rounded-xl border border-[#173E38]/15 bg-white px-3 py-2 text-sm text-[#173E38] outline-none focus:border-[#173E38]';
const labelCls = 'mb-1 block text-xs font-medium text-[#173E38]/65';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string>(() => {
    try {
      // QRコードから引き継がれたトークン（#Admin?t=...）
      const m = window.location.hash.match(/[?&]t=([^&]+)/);
      if (m) {
        const t = decodeURIComponent(m[1]);
        localStorage.setItem(TOKEN_KEY, t);
        window.history.replaceState(null, '', `${window.location.pathname}#Admin`);
        return t;
      }
      return localStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [qrUrl, setQrUrl] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [sha, setSha] = useState('');
  const [tab, setTab] = useState<'hotels' | 'contact'>('hotels');
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactSha, setContactSha] = useState('');
  const [contactDirty, setContactDirty] = useState(false);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [q, setQ] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const roomFileRef = useRef<HTMLInputElement>(null);
  const roomTarget = useRef(0);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const qrTarget = useRef(0);
  const [removedImages, setRemovedImages] = useState<string[]>([]);

  const load = async (t: string) => {
    setLoading(true);
    setMsg(null);
    try {
      const f = await gh(t, `/repos/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`);
      setHotels(JSON.parse(b64ToUtf8(f.content)));
      setSha(f.sha);
      const c = await gh(t, `/repos/${REPO}/contents/${CONTACT_PATH}?ref=${BRANCH}`);
      setContact(JSON.parse(b64ToUtf8(c.content)));
      setContactSha(c.sha);
      setContactDirty(false);
      setSel(0);
      setDirty(false);
      setPending([]);
    } catch (e) {
      setMsg({ kind: 'err', text: `読み込みに失敗しました：${(e as Error).message}（トークンが正しいか、権限が「Contents: Read and write」か確認してください）` });
      if (String((e as Error).message).startsWith('401')) {
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch {
          /* ignore */
        }
        setToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || contactDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, contactDirty]);

  const updateContact = (patch: Partial<Contact>) => {
    setContact((c) => (c ? { ...c, ...patch } : c));
    setContactDirty(true);
  };

  const hotel = hotels[sel];
  const update = (patch: Partial<Hotel>) => {
    setHotels((list) => list.map((h, i) => (i === sel ? { ...h, ...patch } : h)));
    setDirty(true);
  };
  const updateRoom = (i: number, patch: Partial<Room>) => {
    const rooms = (hotel.rooms ?? []).map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    update({ rooms });
  };

  const filtered = useMemo(
    () => hotels.map((h, i) => ({ h, i })).filter(({ h }) => !q || (h.name + h.en + h.cityLabel).toLowerCase().includes(q.toLowerCase())),
    [hotels, q],
  );

  const connect = () => {
    const t = tokenInput.trim();
    if (!t) return;
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* ignore */
    }
    setToken(t);
    setTokenInput('');
  };

  const logout = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken('');
    setHotels([]);
  };

  const addHotel = () => {
    const h: Hotel = {
      city: areas[0].key,
      cityLabel: areas[0].label,
      name: '新しいホテル',
      en: `New Hotel ${hotels.length + 1}`,
      stars: 3,
      size: '',
      price: 'お問い合わせ',
      tax: '',
      note: '',
      address: '',
      phone: '',
      url: '',
      highlights: [],
      rooms: [],
      image: PLACEHOLDER,
    };
    setHotels((l) => [...l, h]);
    setSel(hotels.length);
    setDirty(true);
  };

  const removeHotel = () => {
    if (!hotel) return;
    if (hotel.en === 'HOTEL MONTEREY LA SOEUR OSAKA') {
      alert('ホテルモントレは客室予約画面に使われているため、削除できません。');
      return;
    }
    if (!confirm(`「${hotel.name}」を削除します。よろしいですか？`)) return;
    setHotels((l) => l.filter((_, i) => i !== sel));
    setSel(0);
    setDirty(true);
  };

  const makeImage = async (f: File | undefined, prefix: string): Promise<string | null> => {
    if (!f || !hotel) return null;
    if (!f.type.startsWith('image/')) {
      setMsg({ kind: 'err', text: '画像ファイル（JPG / PNG など）を選んでください。' });
      return null;
    }
    try {
      const { base64, preview } = await resizeToJpegBase64(f);
      const path = `images/hotels/${slug(hotel.en)}${prefix}-${Date.now()}.jpg`;
      setPending((p) => [...p, { path, base64, preview }]);
      return path;
    } catch {
      setMsg({ kind: 'err', text: '画像を読み込めませんでした。別の画像でお試しください。' });
      return null;
    }
  };

  const onFiles = async (files: FileList | null) => {
    const path = await makeImage(files?.[0], '');
    if (path) update({ image: path });
  };

  const onRoomFile = async (i: number, file: File | undefined) => {
    const path = await makeImage(file, `-room${i + 1}`);
    if (path) updateRoom(i, { image: path });
  };

  const qrs = contact?.qrs ?? [];
  const setQrs = (list: Qr[]) => updateContact({ qrs: list });
  const dropOldQr = (old: string) => {
    if (old.startsWith('images/contact/') && !pending.some((p) => p.path === old)) setRemovedImages((r) => [...r, old]);
  };
  const onQrFile = async (i: number, f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setMsg({ kind: 'err', text: '画像ファイル（JPG / PNG など）を選んでください。' });
      return;
    }
    try {
      const { base64, preview } = await resizeToJpegBase64(f, 800, 'image/png');
      const path = `images/contact/qr-${Date.now()}.png`;
      setPending((p) => [...p, { path, base64, preview }]);
      dropOldQr(qrs[i]?.image ?? '');
      setQrs(qrs.map((q, idx) => (idx === i ? { ...q, image: path } : q)));
    } catch {
      setMsg({ kind: 'err', text: '画像を読み込めませんでした。別の画像でお試しください。' });
    }
  };

  const previewOf = (img: string) => pending.find((p) => p.path === img)?.preview ?? img;

  const save = async () => {
    if (!token) return;
    if (!dirty && !contactDirty) return;
    const dup = hotels.find((h, i) => hotels.findIndex((x) => x.en === h.en) !== i);
    if (dup) {
      setMsg({ kind: 'err', text: `英語名（ID）「${dup.en}」が重複しています。ホテルごとに別の英語名にしてください。` });
      return;
    }
    if (hotels.some((h) => !h.name.trim() || !h.en.trim())) {
      setMsg({ kind: 'err', text: 'ホテル名と英語名（ID）は必須です。' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      if (contactDirty && contact) {
        const usedQr = new Set((contact.qrs ?? []).map((q) => q.image));
        for (const p of pending.filter((x) => usedQr.has(x.path))) {
          await gh(token, `/repos/${REPO}/contents/public/${p.path}`, {
            method: 'PUT',
            body: JSON.stringify({ message: `Add image ${p.path}`, content: p.base64, branch: BRANCH }),
          });
        }
        const cr = await gh(token, `/repos/${REPO}/contents/${CONTACT_PATH}`, {
          method: 'PUT',
          body: JSON.stringify({
            message: 'Update contact via admin',
            content: utf8ToB64(JSON.stringify(contact, null, 2) + '\n'),
            sha: contactSha,
            branch: BRANCH,
          }),
        });
        setContactSha(cr.content.sha);
        setContactDirty(false);
        for (const path of removedImages) {
          try {
            const f = await gh(token, `/repos/${REPO}/contents/public/${path}?ref=${BRANCH}`);
            await gh(token, `/repos/${REPO}/contents/public/${path}`, {
              method: 'DELETE',
              body: JSON.stringify({ message: `Remove image ${path}`, sha: f.sha, branch: BRANCH }),
            });
          } catch {
            /* ignore: file may already be gone */
          }
        }
        setRemovedImages([]);
      }
      if (!dirty) {
        setMsg({ kind: 'ok', text: '保存しました。1〜3分ほどでサイトに反映されます。' });
        return;
      }
      const used = new Set(hotels.flatMap((h) => [h.image, ...(h.rooms ?? []).map((r) => r.image ?? '')]));
      for (const p of pending.filter((x) => used.has(x.path))) {
        await gh(token, `/repos/${REPO}/contents/public/${p.path}`, {
          method: 'PUT',
          body: JSON.stringify({ message: `Add image ${p.path}`, content: p.base64, branch: BRANCH }),
        });
      }
      const cleaned = hotels.map((h) => ({
        ...h,
        highlights: (h.highlights ?? []).filter(Boolean),
        rooms: (h.rooms ?? []).filter((r) => r.roomType.trim()),
      }));
      const res = await gh(token, `/repos/${REPO}/contents/${DATA_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Update hotel data via admin',
          content: utf8ToB64(JSON.stringify(cleaned, null, 2) + '\n'),
          sha,
          branch: BRANCH,
        }),
      });
      setSha(res.content.sha);
      setPending([]);
      setDirty(false);
      setMsg({ kind: 'ok', text: '保存しました。1〜3分ほどでサイトに反映されます。' });
    } catch (e) {
      const m = (e as Error).message;
      setMsg({
        kind: 'err',
        text: m.startsWith('409')
          ? '他の場所で先に更新されています。「クリア」を押してから、もう一度編集してください。'
          : `保存に失敗しました：${m}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const showHandoffQr = async () => {
    const url = `${window.location.origin}${window.location.pathname}#Admin?t=${encodeURIComponent(token)}`;
    setQrUrl(await QRCode.toDataURL(url, { width: 360, margin: 2, errorCorrectionLevel: 'L' }));
    window.setTimeout(() => setQrUrl(''), 90000);
  };

  const goHome = () => {
    window.location.hash = '';
    window.location.reload();
  };

  // ---------- token screen ----------
  if (!token) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h2 className="text-3xl font-semibold text-[#173E38]">管理画面</h2>
        <p className="mt-3 text-sm leading-7 text-[#173E38]/70">ホテル情報の編集・追加・写真の添付ができます。最初に、GitHubの「アクセストークン」を1回だけ入力します。</p>
        <div className="mt-6 rounded-[1.6rem] border border-[#173E38]/10 bg-white p-6 text-sm leading-7 text-[#173E38]/80">
          <div className="font-semibold text-[#173E38]">トークンの作り方（1回だけ）</div>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>GitHubにログインし、右上のアイコン → Settings を開きます。</li>
            <li>左メニューの一番下「Developer settings」→「Personal access tokens」→「Fine-grained tokens」。</li>
            <li>「Generate new token」を押します。</li>
            <li>Token name：japan-dream-service-admin　／　Expiration：90 days（期限は任意）。</li>
            <li>Repository access：「Only select repositories」→ <b>japan-dream-service</b> だけを選びます。</li>
            <li>Permissions → Repository permissions → <b>Contents：Read and write</b> に設定します。</li>
            <li>「Generate token」を押し、表示された <code>github_pat_…</code> をコピーして、下に貼り付けます。</li>
          </ol>
          <div className="mt-3 text-xs text-[#173E38]/60">※ トークンはこのブラウザの中にだけ保存されます。共有のパソコンでは使わないでください。</div>
        </div>
        <div className="mt-6 flex gap-3">
          <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="github_pat_..." className={inputCls} />
          <button onClick={connect} className="shrink-0 rounded-xl bg-[#173E38] px-5 py-2 text-sm text-white hover:bg-[#143A35]">接続</button>
        </div>
        {msg && <div className={`mt-4 rounded-xl p-3 text-sm ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
        <button onClick={goHome} className="mt-6 text-sm text-[#173E38]/60 underline">サイトに戻る</button>
      </div>
    );
  }

  // ---------- editor ----------
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold text-[#173E38]">ホテル管理画面</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            onClick={() => {
              if ((dirty || contactDirty) && !confirm('未保存の変更を破棄して、公開中の最新の内容に戻します。よろしいですか？')) return;
              load(token);
            }}
            disabled={loading}
            title="未保存の変更を破棄して、公開中の内容を読み込み直します"
            className="rounded-xl border border-[#173E38]/15 bg-white px-4 py-2 text-[#173E38] hover:bg-[#F7F3E8]"
          >
            クリア
          </button>
          <button onClick={save} disabled={saving || (!dirty && !contactDirty)} className="rounded-xl bg-[#173E38] px-6 py-2 text-white hover:bg-[#143A35] disabled:opacity-40">
            {saving ? '保存中…' : dirty || contactDirty ? '保存して公開' : '変更なし'}
          </button>
        </div>
      </div>
      {msg && <div className={`mt-4 rounded-xl p-3 text-sm ${msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
      {qrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setQrUrl('')}>
          <div className="w-full max-w-sm rounded-[1.6rem] bg-white p-6 text-center text-[#173E38]" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold">他の端末に引き継ぐ</div>
            <p className="mt-2 text-xs leading-6 text-[#173E38]/70">スマホなど、引き継ぎ先のカメラでこのQRコードを読み取ると、管理画面にそのまま入れます。</p>
            <img src={qrUrl} alt="引き継ぎ用QRコード" className="mx-auto mt-4 w-full max-w-[300px]" />
            <p className="mt-3 text-xs leading-6 text-[#C2410C]">このQRコードにはトークン（鍵）が入っています。他の人に見せたり、撮影されたりしないでください。90秒で自動的に閉じます。</p>
            <button onClick={() => setQrUrl('')} className="mt-4 rounded-xl bg-[#173E38] px-6 py-2 text-sm text-white hover:bg-[#143A35]">閉じる</button>
          </div>
        </div>
      )}
      {(dirty || contactDirty) && <div className="mt-3 text-xs text-[#C2410C]">未保存の変更があります。</div>}

      <div className="mt-6 flex gap-2">
        {([['hotels', 'ホテル'], ['contact', 'コンタクト']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-5 py-2 text-sm transition ${tab === k ? 'bg-[#173E38] text-white' : 'bg-white text-[#173E38] ring-1 ring-[#173E38]/15 hover:bg-[#F7F3E8]'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'contact' && contact && (
        <div className="mt-6 max-w-3xl rounded-[1.6rem] border border-[#173E38]/10 bg-white p-6">
          <div className="grid gap-4">
            <Field label="小見出し（英字ラベル）">
              <input className={inputCls} value={contact.label} onChange={(e) => updateContact({ label: e.target.value })} />
            </Field>
            <Field label="見出し">
              <input className={inputCls} value={contact.title} onChange={(e) => updateContact({ title: e.target.value })} />
            </Field>
            <Field label="本文（改行できます）">
              <textarea rows={4} className={inputCls} value={contact.message} onChange={(e) => updateContact({ message: e.target.value })} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="電話番号">
                <input className={inputCls} value={contact.phone} onChange={(e) => updateContact({ phone: e.target.value })} />
              </Field>
              <Field label="メールアドレス">
                <input className={inputCls} value={contact.email} onChange={(e) => updateContact({ email: e.target.value })} />
              </Field>
              <Field label="微信 / LINE">
                <input className={inputCls} value={contact.chat} onChange={(e) => updateContact({ chat: e.target.value })} />
              </Field>
              <Field label="営業時間">
                <input className={inputCls} value={contact.hours} onChange={(e) => updateContact({ hours: e.target.value })} />
              </Field>
            </div>
            <Field label="住所">
              <input className={inputCls} value={contact.address} onChange={(e) => updateContact({ address: e.target.value })} />
            </Field>
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls}>QRコード・画像（微信 / LINE など）</span>
                <button onClick={() => setQrs([...qrs, { label: '', image: '' }])} className="rounded-lg border border-[#173E38]/15 px-3 py-1 text-xs text-[#173E38] hover:bg-[#F7F3E8]">＋画像を追加</button>
              </div>
              <input ref={qrFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                onQrFile(qrTarget.current, e.target.files?.[0]);
                e.target.value = '';
              }} />
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {qrs.map((q, i) => (
                  <div key={i} className="rounded-xl border border-[#173E38]/10 bg-[#FBFAF6] p-3">
                    <div
                      onClick={() => {
                        qrTarget.current = i;
                        qrFileRef.current?.click();
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        onQrFile(i, e.dataTransfer.files[0]);
                      }}
                      className="flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[#173E38]/20 bg-white text-xs text-[#173E38]/50"
                    >
                      {q.image ? <img src={previewOf(q.image)} alt="" className="h-full w-full object-contain" /> : 'クリックまたはドロップして画像を選択'}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input className={inputCls} placeholder="ラベル（例：微信）" value={q.label} onChange={(e) => setQrs(qrs.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} />
                      <button
                        onClick={() => {
                          dropOldQr(q.image);
                          setQrs(qrs.filter((_, idx) => idx !== i));
                        }}
                        className="shrink-0 rounded-lg px-3 text-sm text-red-600 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
                {qrs.length === 0 && <div className="text-xs text-[#173E38]/55">画像はまだありません。「＋画像を追加」を押してください。</div>}
              </div>
            </div>
            <div className="text-xs leading-6 text-[#173E38]/60">※ 電話・メール・微信/LINEは、各ホテルの客房预览ページの「咨询方式栏」にも表示されます。空欄にした項目は、コンタクトページでは非表示になります。</div>
            <div className="flex justify-end">
              <button onClick={save} disabled={saving || (!dirty && !contactDirty)} className="rounded-xl bg-[#173E38] px-6 py-2 text-sm text-white hover:bg-[#143A35] disabled:opacity-40">
                {saving ? '保存中…' : '保存して公開'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`mt-6 grid gap-6 md:grid-cols-[300px_1fr] ${tab === 'hotels' ? '' : 'hidden'}`}>
        <div className="rounded-[1.6rem] border border-[#173E38]/10 bg-white p-4">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="検索" className={inputCls} />
            <button onClick={addHotel} className="shrink-0 rounded-xl bg-[#173E38] px-3 py-2 text-sm text-white hover:bg-[#143A35]">＋追加</button>
          </div>
          <div className="mt-3 max-h-[70vh] overflow-y-auto">
            {loading && <div className="p-3 text-sm text-[#173E38]/60">読み込み中…</div>}
            {filtered.map(({ h, i }) => (
              <button
                key={h.en + i}
                onClick={() => setSel(i)}
                className={`mb-1 flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition ${i === sel ? 'bg-[#173E38] text-white' : 'text-[#173E38] hover:bg-[#F7F3E8]'}`}
              >
                <span>{h.name}</span>
                <span className={`text-xs ${i === sel ? 'text-white/70' : 'text-[#173E38]/50'}`}>{h.cityLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {hotel && (
          <div className="rounded-[1.6rem] border border-[#173E38]/10 bg-white p-6">
            {hotel.en === 'HOTEL MONTEREY LA SOEUR OSAKA' && (
              <div className="mb-4 rounded-xl bg-[#F7F3E8] p-3 text-xs leading-6 text-[#173E38]/80">
                ※ ホテルモントレの客室料金表（区分A〜D）とキャンセルポリシーは、別のデータで管理しているため、この画面では編集できません。
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ホテル名（日本語）">
                <input className={inputCls} value={hotel.name} onChange={(e) => update({ name: e.target.value })} />
              </Field>
              <Field label="英語名（ページのID。重複不可）">
                <input className={inputCls} value={hotel.en} onChange={(e) => update({ en: e.target.value })} />
              </Field>
              <Field label="エリア">
                <select
                  className={inputCls}
                  value={hotel.city}
                  onChange={(e) => update({ city: e.target.value, cityLabel: areas.find((a) => a.key === e.target.value)?.label ?? '' })}
                >
                  {areas.map((a) => (
                    <option key={a.key} value={a.key}>{a.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="星の数（0〜5）">
                <input type="number" min={0} max={5} className={inputCls} value={hotel.stars} onChange={(e) => update({ stars: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })} />
              </Field>
              <Field label="房型 / 面積">
                <input className={inputCls} value={hotel.size} onChange={(e) => update({ size: e.target.value })} />
              </Field>
              <Field label="価格">
                <input className={inputCls} value={hotel.price} onChange={(e) => update({ price: e.target.value })} />
              </Field>
              <Field label="税費">
                <input className={inputCls} value={hotel.tax} onChange={(e) => update({ tax: e.target.value })} />
              </Field>
              <Field label="電話番号">
                <input className={inputCls} value={hotel.phone ?? ''} onChange={(e) => update({ phone: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="住所">
                  <input className={inputCls} value={hotel.address} onChange={(e) => update({ address: e.target.value })} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="公式サイトURL">
                  <input className={inputCls} value={hotel.url ?? ''} onChange={(e) => update({ url: e.target.value })} placeholder="https://..." />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="備考（アクセス・特徴など）">
                  <input className={inputCls} value={hotel.note} onChange={(e) => update({ note: e.target.value })} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="特徴タグ（1行に1つ）">
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={(hotel.highlights ?? []).join('\n')}
                    onChange={(e) => update({ highlights: e.target.value.split('\n') })}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6">
              <span className={labelCls}>写真（ドラッグ＆ドロップ、またはクリックして選択）</span>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onFiles(e.dataTransfer.files);
                }}
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-sm transition ${dragOver ? 'border-[#173E38] bg-[#F7F3E8]' : 'border-[#173E38]/20 bg-[#FBFAF6]'}`}
              >
                <img src={previewOf(hotel.image)} alt="" className="h-44 w-full max-w-md rounded-xl object-cover" />
                <span className="text-[#173E38]/65">ここに画像をドロップ（自動で縮小して保存されます）</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className={labelCls}>客室タイプ（客房预览ページの選択肢・客室ごとの写真）</span>
                <button onClick={() => update({ rooms: [...(hotel.rooms ?? []), { roomType: '', size: '', occupancy: '', note: '' }] })} className="rounded-lg border border-[#173E38]/15 px-3 py-1 text-xs text-[#173E38] hover:bg-[#F7F3E8]">＋客室を追加</button>
              </div>
              <input ref={roomFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                onRoomFile(roomTarget.current, e.target.files?.[0]);
                e.target.value = '';
              }} />
              <div className="mt-2 grid gap-3">
                {(hotel.rooms ?? []).map((r, i) => (
                  <div key={i} className="grid items-center gap-2 rounded-xl border border-[#173E38]/10 bg-[#FBFAF6] p-3 md:grid-cols-[88px_1.2fr_1fr_0.8fr_2fr_auto]">
                    <div
                      onClick={() => {
                        roomTarget.current = i;
                        roomFileRef.current?.click();
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        onRoomFile(i, e.dataTransfer.files[0]);
                      }}
                      title="客室の写真（クリックまたはドロップ）"
                      className="flex h-16 w-[88px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#173E38]/25 bg-white text-center text-[11px] leading-4 text-[#173E38]/50"
                    >
                      {r.image ? <img src={previewOf(r.image)} alt="" className="h-full w-full object-cover" /> : '写真を追加'}
                    </div>
                    <input className={inputCls} placeholder="タイプ名" value={r.roomType} onChange={(e) => updateRoom(i, { roomType: e.target.value })} />
                    <input className={inputCls} placeholder="面積" value={r.size ?? ''} onChange={(e) => updateRoom(i, { size: e.target.value })} />
                    <input className={inputCls} placeholder="人数" value={r.occupancy ?? ''} onChange={(e) => updateRoom(i, { occupancy: e.target.value })} />
                    <input className={inputCls} placeholder="説明" value={r.note ?? ''} onChange={(e) => updateRoom(i, { note: e.target.value })} />
                    <button onClick={() => update({ rooms: (hotel.rooms ?? []).filter((_, idx) => idx !== i) })} className="rounded-lg px-3 text-sm text-red-600 hover:bg-red-50">削除</button>
                  </div>
                ))}
                {(hotel.rooms ?? []).length === 0 && <div className="text-xs text-[#173E38]/55">未設定の場合は「標準客室」1つが表示されます。</div>}
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button onClick={removeHotel} className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50">このホテルを削除</button>
              <button onClick={save} disabled={saving || !dirty} className="rounded-xl bg-[#173E38] px-6 py-2 text-sm text-white hover:bg-[#143A35] disabled:opacity-40">
                {saving ? '保存中…' : '保存して公開'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-8 flex items-end justify-between">
        <div className="flex items-end gap-5">
          <button onClick={goHome} className="text-sm text-[#173E38]/60 underline">サイトに戻る</button>
          <button onClick={showHandoffQr} className="text-sm text-[#173E38]/60 underline">他の端末に引き継ぐ（QR）</button>
        </div>
        <button
          onClick={() => {
            if (confirm('保存済みのトークンをこのブラウザから削除します。再度使うには、トークンの入力が必要です。よろしいですか？')) logout();
          }}
          className="text-[11px] text-[#173E38]/35 underline hover:text-[#173E38]/60"
        >
          トークンを削除
        </button>
      </div>
    </div>
  );
}
