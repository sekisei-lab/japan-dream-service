export type Area = { key: string; label: string; desc: string };

// JISコード順の47都道府県（地方ごとにグループ化）
export const PREF_GROUPS: { region: string; items: [number, string][] }[] = [
  { region: '北海道・東北', items: [[1, '北海道'], [2, '青森県'], [3, '岩手県'], [4, '宮城県'], [5, '秋田県'], [6, '山形県'], [7, '福島県']] },
  { region: '関東', items: [[8, '茨城県'], [9, '栃木県'], [10, '群馬県'], [11, '埼玉県'], [12, '千葉県'], [13, '東京都'], [14, '神奈川県']] },
  { region: '中部', items: [[15, '新潟県'], [16, '富山県'], [17, '石川県'], [18, '福井県'], [19, '山梨県'], [20, '長野県'], [21, '岐阜県'], [22, '静岡県'], [23, '愛知県']] },
  { region: '近畿', items: [[24, '三重県'], [25, '滋賀県'], [26, '京都府'], [27, '大阪府'], [28, '兵庫県'], [29, '奈良県'], [30, '和歌山県']] },
  { region: '中国', items: [[31, '鳥取県'], [32, '島根県'], [33, '岡山県'], [34, '広島県'], [35, '山口県']] },
  { region: '四国', items: [[36, '徳島県'], [37, '香川県'], [38, '愛媛県'], [39, '高知県']] },
  { region: '九州・沖縄', items: [[40, '福岡県'], [41, '佐賀県'], [42, '長崎県'], [43, '熊本県'], [44, '大分県'], [45, '宮崎県'], [46, '鹿児島県'], [47, '沖縄県']] },
];

export const prefKey = (code: number) => `pref-${String(code).padStart(2, '0')}`;

export const prefectures: Area[] = PREF_GROUPS.flatMap((g) =>
  g.items.map(([code, label]) => ({ key: prefKey(code), label, desc: `${label}のホテル` })),
);

// 既存エリア（areas.json）に、ホテルが登録されている都道府県を追加した一覧を返す
export function buildAreas(base: Area[], hotels: { city: string; cityLabel: string }[]): Area[] {
  const result = [...base];
  const have = new Set(base.map((a) => a.key));
  const used = new Set(hotels.map((h) => h.city));
  for (const p of prefectures) {
    if (used.has(p.key) && !have.has(p.key)) {
      result.push(p);
      have.add(p.key);
    }
  }
  // 想定外のキーが使われていても、表示から漏れないようにする
  for (const h of hotels) {
    if (!have.has(h.city)) {
      result.push({ key: h.city, label: h.cityLabel || h.city, desc: `${h.cityLabel || h.city}のホテル` });
      have.add(h.city);
    }
  }
  return result;
}

const DESIGNATED = ['札幌市', '仙台市', 'さいたま市', '千葉市', '横浜市', '川崎市', '相模原市', '新潟市', '静岡市', '浜松市', '名古屋市', '京都市', '大阪市', '堺市', '神戸市', '岡山市', '広島市', '北九州市', '福岡市', '熊本市'];

// 住所から市区町村名を取り出す（例：木更津市→木更津、京都市→京都市、江東区→江東区）
export function municipality(address?: string): string {
  let a = (address ?? '').replace(/^〒?\s*\d{3}-?\d{4}\s*/, '');
  a = a.replace(/^(北海道|東京都|京都府|大阪府|[^\s都道府県]{2,3}県)/, '');
  a = a.replace(/^.+?郡/, '');
  const m = a.match(/^(.+?市|.+?区|.+?町|.+?村)/);
  if (!m) return '';
  const name = m[1];
  return name.endsWith('市') && !DESIGNATED.includes(name) ? name.slice(0, -1) : name;
}

// カード左上に出すサブ情報：手入力があればそれ、なければ住所から自動、取れなければ都道府県名
export function subArea(h: { address?: string; sub?: string; cityLabel: string }): string {
  return (h.sub && h.sub.trim()) || municipality(h.address) || h.cityLabel;
}
