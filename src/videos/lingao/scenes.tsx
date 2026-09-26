import React from 'react';
import { Armillary, Embers, MorningStar, Rays } from '../ming/art/sky';
import { Furnace, GateTower } from '../ming/art/ming';
import { HainanMap } from '../ming/art/maps';
import { BeamEngine, Warship } from '../ming/art/industry';
import { CementKiln, Crowd, NovelBook, SchoolPanels, TechTree, Workers } from '../ming/art/lingao';
import { Pylon, Seal } from '../ming/art/modern';
import { Art, Body, Caption, Figure, Headline, prog, stag, dash, useBeat } from '../ming/kit';
import { accent, C, F } from '../ming/theme';
import { CargoShip, Cannon, EastAsiaMap, HainanTowns, MeetingTable, PearlRiverMap, SaltPans, Wormhole } from './art';

type Scene = React.FC;

const Word: React.FC<{ word: string; caption: string; children: React.ReactNode }> = ({ word, caption, children }) => (
  <>
    <Art>{children}</Art>
    <Headline lines={[[{ t: word, a: true }]]} x={150} y={190} size={210} at={1} />
    <Caption text={caption} x={160} y={460} at={6} />
  </>
);

/** 百科卡片 — linked index cards for the fan wiki. */
const WikiCards: React.FC = () => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, 4, 50, 'inout');
  const cards = ['人物', '元老', '地理', '年表', '工业', '军事', '章节', '同人'];
  return (
    <Art>
      {cards.map((t, i) => {
        const x = 1000 + (i % 4) * 190;
        const y = 330 + Math.floor(i / 4) * 280;
        const o = stag(p, i, cards.length);
        return (
          <g key={t} opacity={o} strokeWidth={2}>
            <rect x={x} y={y} width={160} height={210} rx={8} fill={mode === 'dark' ? C.night : C.paper} />
            <text x={x + 80} y={y + 52} textAnchor="middle" fill={i % 3 === 0 ? a : 'currentColor'} stroke="none" style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 34 }}>{t}</text>
            {[90, 120, 150, 180].map((ly, k) => <line key={ly} x1={x + 20} y1={y + ly} x2={x + 140 - k * 18} y2={y + ly} strokeWidth={4} opacity={0.5} />)}
            {i % 4 < 3 && <line x1={x + 160} y1={y + 105} x2={x + 190} y2={y + 105} stroke={a} strokeWidth={2} />}
          </g>
        );
      })}
    </Art>
  );
};

/** 实体书 — three printed volumes standing on a shelf. */
const BookShelf: React.FC = () => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const books: [string, string][] = [['第一卷', '2017'], ['第二卷', '2022'], ['第三卷', '2025']];
  return (
    <Art>
      <line x1={980} y1={860} x2={1800} y2={860} strokeWidth={3} {...dash(prog(f, 0, 20))} />
      {books.map(([t, y], i) => {
        const o = prog(f, 10 + i * 14, 20, 'inout');
        const x = 1060 + i * 240;
        return (
          <g key={t} strokeWidth={2.4} opacity={o} transform={`translate(0 ${(1 - o) * 60})`}>
            <rect x={x} y={360} width={180} height={500} rx={6} fill={mode === 'dark' ? C.night : C.paper} />
            <rect x={x} y={360} width={180} height={500} rx={6} fill="url(#hatch-paper)" opacity={0.25} stroke="none" />
            <line x1={x + 18} y1={360} x2={x + 18} y2={860} />
            <text x={x + 100} y={440} textAnchor="middle" fill="currentColor" stroke="none" writingMode="tb" style={{ fontFamily: F.brush, fontSize: 64 }}>临高启明</text>
            <rect x={x + 60} y={720} width={80} height={36} fill={a} stroke="none" />
            <text x={x + 100} y={746} textAnchor="middle" fill={C.cream} stroke="none" style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 20 }}>{t}</text>
            <text x={x + 90} y={910} textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: F.mono, fontSize: 30 }}>{y}</text>
          </g>
        );
      })}
    </Art>
  );
};

const Counts: React.FC = () => {
  const { f } = useBeat();
  const a = prog(f, 10, 40, 'inout');
  const b = prog(f, 40, 50, 'inout');
  return (
    <>
      <Figure text={`${Math.round(800 * a)} 万字`} x={150} y={420} size={120} at={8} />
      <Caption text="2020 年 · 七卷 · 研究文章统计" x={160} y={570} at={20} />
      <Figure text={`${Math.round(2952 * b)} 章`} x={1000} y={420} size={120} at={38} />
      <Caption text="2026 年 9 月 · 起点中文网目录" x={1010} y={570} at={50} />
    </>
  );
};

export const SCENES: Record<string, Scene> = {
  hole: () => (
    <>
      <Art><Wormhole cx={1250} cy={540} /></Art>
      <Headline lines={[['202X 年，'], [{ t: 'D 日', a: true }, '。']]} x={150} y={300} size={130} at={16} />
      <Caption text="一个虫洞，通向 1628 年" y={620} at={40} />
    </>
  ),
  'five-hundred': () => (
    <>
      <Art zoom={0.02}><Crowd cx={960} cy={840} /></Art>
      <Headline lines={[[{ t: '五百多个普通人', a: true }, '，决定穿过去。']]} x={0} width={1920} align="center" y={100} size={82} />
      <Caption text="各行各业的失意青年 · 自嘲“五百废”" x={0} width={1920} align="center" y={230} at={24} />
    </>
  ),
  title: () => (
    <>
      <Art glow={false}><Armillary cx={960} cy={520} r={470} len={1} opacity={0.22} spin={0.3} /></Art>
      <Art><MorningStar x={960} y={230} size={70} at={4} /><Embers x={960} y={760} w={900} n={70} rise={500} seed={3} /></Art>
      <Headline lines={['临高启明']} x={0} width={1920} align="center" y={360} size={210} at={10} stagger={5} />
      <Caption text="全 书 导 读" x={0} width={1920} align="center" y={640} at={36} size={30} />
      <Body lines={['一部网友接力写了十七年、至今仍在连载的穿越小说']} x={0} width={1920} align="center" y={720} at={50} size={34} />
    </>
  ),

  ship: () => (
    <>
      <Art><CargoShip x={1180} y={760} s={0.95} /></Art>
      <Headline lines={[['他们筹备物资，'], ['装满', { t: '一艘船', a: true }, '。']]} x={150} y={150} size={100} />
      <Caption text="丰城轮 · 满载现代工业生产资料" y={400} at={24} />
    </>
  ),
  meeting: () => (
    <>
      <Art><MeetingTable x={1180} y={620} items={['能源', '机械', '人员', '后勤', '武器']} at={4} /></Art>
      <Headline lines={[[{ t: '出发之前：', dim: true }], ['开', { t: '会', a: true }, '。']]} x={150} y={180} size={120} />
      <Caption text="第一卷 · 在现代筹划一切" y={460} at={24} />
    </>
  ),

  land: () => (
    <>
      <Art zoom={0.05}><HainanMap at={2} /></Art>
      <Headline lines={[['1628，'], ['崇祯元年，'], ['登陆', { t: '临高', a: true }, '。']]} x={150} y={200} size={100} />
      <Caption text="博铺登陆 · 建立根据地" y={580} at={30} />
    </>
  ),
  bairen: () => (
    <>
      <Art><Cannon x={1250} y={820} s={0.95} at={4} /></Art>
      <Headline lines={[[{ t: '第一仗：', dim: true }], [{ t: '百仞滩', a: true }, '。']]} x={150} y={220} size={130} />
      <Caption text="首战告捷 · 站稳脚跟" y={520} at={24} />
    </>
  ),
  cement: () => <Word word="水泥。" caption="建港口 · 修道路"><CementKiln x={1200} y={880} s={0.85} /></Word>,
  salt: () => <Word word="盐场。" caption="晒盐 · 第一批商品"><SaltPans x={1300} y={600} /></Word>,
  school: () => <Word word="教育。" caption="扫盲 · 技术培训 · 训练归化民"><Workers y={940} /></Word>,
  telegraph: () => <Word word="电报。" caption="电报站连起各个据点"><Pylon x={1350} y={960} s={1.1} /></Word>,
  australian: () => (
    <>
      <Art glow={false}><Seal x={1420} y={540} size={300} text="澳宋" at={16} /></Art>
      <Headline lines={[[{ t: '对外，他们自称', dim: true }], [{ t: '“澳洲人”', a: true }, '。']]} x={150} y={250} size={110} />
      <Body lines={['政权号称“澳宋”，自称南宋遗民之后；', '明人则叫他们“髡贼”——因为剪了短发。']} y={560} at={30} size={36} width={900} />
    </>
  ),

  senate: () => (
    <>
      <Art zoom={0.02}><Crowd cx={960} cy={840} n={521} target={521} plus={false} /></Art>
      <Headline lines={[[{ t: '521 名', a: true }, '穿越者自命“元老”，组成元老院。']]} x={0} width={1920} align="center" y={100} size={70} />
      <Caption text="第三卷 · 新社会 · 集体领导的“元老院专政”" x={0} width={1920} align="center" y={220} at={24} />
    </>
  ),
  plan: () => (
    <>
      <Art><BeamEngine x={1300} y={900} s={1.0} /></Art>
      <Headline lines={[['第一个'], [{ t: '五年计划', a: true }, '。']]} x={150} y={220} size={120} />
      <Caption text="平板玻璃 · 蒸汽机 · 轻便铁路" y={520} at={24} />
    </>
  ),
  sugar: () => (
    <>
      <Art><Warship x={1250} y={820} s={0.75} at={2} /></Art>
      <Headline lines={[[{ t: '甜港风云：', dim: true }], ['制糖、贸易、', { t: '海战', a: true }, '。']]} x={150} y={200} size={100} />
      <Caption text="用糖打开市场 · 菊花屿海战" y={460} at={24} />
    </>
  ),
  tax: () => (
    <>
      <Art><SchoolPanels x={960} y={660} /></Art>
      <Headline lines={[[{ t: '秋赋', a: true }, '：从据点，变成政权。']]} x={0} width={1920} align="center" y={120} size={80} />
      <Caption text="征税 · 户籍 · 政治保卫" x={0} width={1920} align="center" y={240} at={24} />
    </>
  ),

  hainan: () => (
    <>
      <Art zoom={0.03}><HainanTowns lit={['临高', '澄迈', '琼山', '儋州', '万州', '三亚']} at={10} /></Art>
      <Headline lines={[['澄迈开城，'], ['三亚建市——'], [{ t: '海南全岛', a: true }, '。']]} x={150} y={220} size={96} />
      <Caption text="第四卷 · 新澳洲" y={600} at={30} />
    </>
  ),
  humen: () => (
    <>
      <Art zoom={0.03}><PearlRiverMap lit={['虎门', '澳门']} at={8} fleet /></Art>
      <Headline lines={[['舰队驶入'], [{ t: '珠江口', a: true }, '。']]} x={150} y={230} size={110} />
      <Caption text="大角、沙角之战 · 虎门 · 澳门和约" y={500} at={30} />
    </>
  ),

  furnace: () => <Word word="钢铁。" caption="第五卷 · 高炉 · 钢铁联合企业 · 机械厂"><Furnace x={1350} y={900} s={1.0} /></Word>,
  jiangnan: () => (
    <>
      <Art zoom={0.02}><EastAsiaMap lit={['杭州', '南京']} done={['临高']} arrows={[['临高', '杭州']]} at={6} /></Art>
      <Headline lines={[['书店、报纸，'], ['进入', { t: '江南', a: true }, '。']]} x={140} y={240} size={86} />
      <Caption text="印刷 · 出版 · 望远镜" y={480} at={24} x={150} width={560} />
    </>
  ),
  north: () => (
    <>
      <Art zoom={0.02}><EastAsiaMap lit={['济州', '登州']} done={['临高']} arrows={[['临高', '济州'], ['济州', '登州']]} at={6} /></Art>
      <Headline lines={[['北上：'], [{ t: '济州岛', a: true }], [{ t: '登州', a: true }, '。']]} x={140} y={220} size={86} />
      <Caption text="济州岛 · 登州之围" y={560} at={24} x={150} width={560} />
    </>
  ),
  japan: () => (
    <>
      <Art zoom={0.02}><EastAsiaMap lit={['对马', '马尼拉']} done={['临高', '济州']} arrows={[['济州', '对马'], ['临高', '马尼拉']]} at={6} /></Art>
      <Headline lines={[['东通日本，'], ['截击', { t: '大帆船', a: true }, '。']]} x={140} y={240} size={86} />
      <Caption text="对马 · 日本贸易 · 马尼拉大帆船" y={480} at={24} x={150} width={560} />
    </>
  ),

  taiwan: () => (
    <>
      <Art zoom={0.02}><EastAsiaMap lit={['澎湖', '安平', '厦门']} done={['临高']} at={6} /></Art>
      <Headline lines={[[{ t: '第六卷 · 纷争', dim: true }], [{ t: '台湾海峡', a: true }, '。']]} x={140} y={240} size={86} />
      <Caption text="澎湖 · 安平 · 厦门" y={480} at={24} x={150} width={560} />
    </>
  ),
  manila: () => (
    <>
      <Art zoom={0.02}><EastAsiaMap lit={['马尼拉']} done={['临高', '安平', '澎湖']} arrows={[['安平', '马尼拉']]} at={6} /></Art>
      <Headline lines={[['南下'], [{ t: '马尼拉', a: true }, '。']]} x={140} y={240} size={100} />
      <Caption text="谍战 · 殖民地治理 · 与西班牙人周旋" y={500} at={24} x={150} width={560} />
    </>
  ),

  guangzhou: () => (
    <>
      <Art zoom={0.03}><PearlRiverMap lit={['广州', '佛山']} done={['虎门', '澳门']} at={6} fleet /></Art>
      <Headline lines={[[{ t: '第七卷 · 大陆', dim: true }], ['拿下'], [{ t: '广州', a: true }, '。']]} x={150} y={180} size={120} />
      <Caption text="两广攻略" y={600} at={30} />
    </>
  ),
  govern: () => (
    <>
      <Art><GateTower x={1320} y={930} s={0.85} /></Art>
      <Headline lines={[['治理广州：'], ['警察、防疫、', { t: '货币', a: true }, '。']]} x={150} y={170} size={96} />
      <Caption text="从占领一座城，到经营一座城" y={430} at={24} />
    </>
  ),

  deepen: () => (
    <>
      <Art zoom={0.02}><g transform="translate(150 200) scale(0.84)"><TechTree at={6} /></g></Art>
      <Headline lines={[['暂停北上，', { t: '深耕经营', a: true }, '。']]} x={0} width={1920} align="center" y={80} size={80} />
      <Caption text="南下寻找原料与市场 · 产业再升级 · 同时向北方渗透" x={0} width={1920} align="center" y={920} at={60} />
    </>
  ),
  beijing: () => (
    <>
      <Art zoom={0.02}><EastAsiaMap lit={['北京', '天津']} done={['临高', '广州', '安平', '马尼拉']} arrows={[['广州', '天津']]} at={6} /></Art>
      <Headline lines={[['渗透北方：'], [{ t: '京师', a: true }, '，'], [{ t: '天津卫', a: true }, '。']]} x={140} y={200} size={90} />
      <Caption text="最新章节：天津卫（二十一）" y={560} at={30} x={150} width={560} />
      <Caption text="2026 年 9 月 20 日 · 仍在连载" y={600} at={36} x={150} width={560} />
    </>
  ),

  'origin-q': () => (
    <Headline lines={[[{ t: '这部书，', dim: true }], ['是怎么', { t: '长出来', a: true }, '的？']]} x={0} width={1920} align="center" y={340} size={130} stagger={10} />
  ),
  forum: () => (
    <>
      <QuoteMark />
      <Headline lines={[['如果带着现代的资源'], ['回到', { t: '明末', a: true }, '……']]} x={150} y={280} size={90} weight={700} />
      <Caption text="2006 · SC论坛 · 网友“独孤求婚”的一个提问" y={540} at={24} />
      <Body lines={['众人接龙，写成跑团小说《天变：崇祯二年》。']} y={600} at={36} size={36} />
    </>
  ),
  start: () => (
    <>
      <Art><NovelBook x={1330} y={560} s={0.95} /></Art>
      <Headline lines={[['2009，'], [{ t: '吹牛者', a: true }, '动笔。']]} x={150} y={150} size={110} />
      <Body lines={['“这个资料不利用起来就可惜了。”']} y={420} at={30} size={36} width={700} />
    </>
  ),
  collective: () => (
    <>
      <Art><NovelBook x={1330} y={560} s={0.95} /></Art>
      <Headline lines={[['读者，'], ['也是', { t: '作者', a: true }, '。']]} x={150} y={150} size={110} />
      <Caption text="一千二百多篇同人 · 讨论反过来改写正文" y={430} at={24} width={760} />
    </>
  ),
  wiki: () => (
    <>
      <WikiCards />
      <Headline lines={[['2015，'], ['读者自建', { t: '百科', a: true }, '。']]} x={150} y={250} size={100} />
      <Caption text="灰机wiki · 整理人物、设定与章节" y={520} at={24} />
    </>
  ),
  books: () => (
    <>
      <BookShelf />
      <Headline lines={[['从屏幕，'], ['到', { t: '纸上', a: true }, '。']]} x={150} y={230} size={110} />
      <Body lines={['2017 · 中国广播影视出版社', '2022 · 现代出版社', '2025 · 广东旅游出版社']} y={500} at={30} size={32} width={700} />
    </>
  ),
  takedown: () => (
    <>
      <Art glow={false}><Seal x={1480} y={520} size={300} text="下架" at={20} /></Art>
      <Headline lines={[['2019 年 4 月 30 日，', { t: '下架', a: true }, '；'], ['11 月 11 日，重新上架。']]} x={150} y={330} size={76} stagger={14} />
      <Caption text="起点中文网" y={560} at={40} />
    </>
  ),
  industrial: () => (
    <>
      <Art><Rays cx={960} cy={540} r0={300} r1={1200} opacity={0.22} n={48} /></Art>
      <Headline lines={[[{ t: '“工业党”', a: true }, '思潮的'], ['代表作。']]} x={0} width={1920} align="center" y={330} size={120} />
      <Caption text="《文艺理论与批评》《新闻界》《东方学刊》等刊物先后讨论" x={0} width={1920} align="center" y={680} at={30} />
    </>
  ),
  critique: () => (
    <>
      <Headline lines={[[{ t: '争议：', dim: true }], ['元老的', { t: '特权与欲望', a: true }, '。']]} x={150} y={260} size={100} />
      <Body lines={['批评者指出：纳妾、奴役等特权，', '在书中被包装成了“进步”。']} y={560} at={30} size={38} width={1000} />
    </>
  ),
  count: () => (
    <>
      <Headline lines={[[{ t: '篇幅', a: true }, '：']]} x={150} y={180} size={100} />
      <Counts />
    </>
  ),

  unfinished: () => (
    <Headline lines={[['十七年，'], [{ t: '仍未完结', a: true }, '。']]} x={0} width={1920} align="center" y={320} size={160} stagger={10} />
  ),
  question: () => (
    <>
      <Art><MorningStar x={960} y={220} size={80} at={2} /></Art>
      <Headline lines={[[{ t: '它反复追问的，只有一个问题：', dim: true }]]} x={0} width={1920} align="center" y={380} size={60} weight={700} />
      <Headline lines={[['如果重来一次，'], ['中国能不能', { t: '先走一步', a: true }, '？']]} x={0} width={1920} align="center" y={480} size={120} at={22} stagger={10} />
    </>
  ),
  end: () => (
    <>
      <Art glow={false}><Armillary cx={960} cy={500} r={420} len={1} opacity={0.15} spin={0.2} /></Art>
      <Art><MorningStar x={960} y={290} size={34} at={0} /></Art>
      <Headline lines={['临高启明']} x={0} width={1920} align="center" y={360} size={120} at={4} stagger={4} />
      <Caption text="吹 牛 者 著 · 起 点 中 文 网 连 载 中" x={0} width={1920} align="center" y={540} at={16} size={26} />
      <Caption text="资料：维基百科 · 起点中文网目录 · 豆瓣 · 公开章节目录 · 剧情按卷概述" x={0} width={1920} align="center" y={820} at={30} size={16} />
    </>
  ),
};

const QuoteMark: React.FC = () => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 14);
  return (
    <div style={{ position: 'absolute', left: 120, top: 90, fontFamily: F.serif, fontWeight: 900, fontSize: 240, lineHeight: 1, color: accent(mode), opacity: p * 0.9 }}>
      “
    </div>
  );
};
