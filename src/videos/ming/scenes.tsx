import React from 'react';
import { Armillary, Embers, MorningStar, Rays } from './art/sky';
import { Furnace, GateTower, Scroll, Throne } from './art/ming';
import { Globe, HainanMap, ZhengHeMap } from './art/maps';
import { BeamEngine, Coal, DivergeChart, GdpChart, Locomotive, Mill, Warship } from './art/industry';
import { CementKiln, Crowd, NovelBook, PowerStation, SchoolPanels, TechTree, Theodolite, Workers } from './art/lingao';
import {
  Balance, BronzeMirror, Chessboard, Chip, Clouds, Gear, IBeam, Ladder, Lathe, Lotus, Pylon, Road, Seal, Skyline, SmileCurve, Spear,
} from './art/modern';
import { Art, Body, Caption, Headline, lerp, prog, useBeat } from './kit';
import { accent, F, fgText, muted } from './theme';

type Scene = React.FC;

/** One word, very large, with a dated caption — the quick-cut industrial beats. */
const Word: React.FC<{ word: string; caption: string; children: React.ReactNode }> = ({ word, caption, children }) => (
  <>
    <Art>{children}</Art>
    <Headline lines={[[{ t: word, a: true }]]} x={150} y={190} size={210} at={1} />
    <Caption text={caption} x={160} y={460} at={6} />
  </>
);

const LitGlobe: React.FC = () => {
  const { f } = useBeat();
  return <Art zoom={0.01}><Globe x={1380} y={540} s={0.95} at={-100} highlight={prog(f, 6, 40, 'inout')} /></Art>;
};

const FadingClouds: React.FC = () => {
  const { f } = useBeat();
  return <Art><Clouds at={0} fade={prog(f, 150, 50, 'inout')} /></Art>;
};

const Rivals: React.FC = () => {
  const { f, mode } = useBeat();
  const p = prog(f, 6, 40, 'inout');
  const q = prog(f, 20, 40, 'inout');
  return (
    <Art>
      <line x1={960} y1={330} x2={960} y2={880} strokeWidth={1.2} strokeDasharray="4 10" opacity={0.6 * p} />
      <Gear x={560} y={580} r={170} teeth={18} spin={f * 0.6} p={p} />
      <Lotus x={1360} y={640} s={0.95} p={q} />
      <text x={560} y={840} textAnchor="middle" fill={accent(mode)} stroke="none" style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 48 }} opacity={p}>工业党</text>
      <text x={560} y={890} textAnchor="middle" fill={muted(mode)} stroke="none" style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 22, letterSpacing: '0.3em' }} opacity={p}>技术 · 组织 · 发展</text>
      <text x={1360} y={840} textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 48 }} opacity={q}>情怀党</text>
      <text x={1360} y={890} textAnchor="middle" fill={muted(mode)} stroke="none" style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 22, letterSpacing: '0.3em' }} opacity={q}>人文 · 道德 · 理想</text>
    </Art>
  );
};

const RewindYear: React.FC = () => {
  const { f, dur, mode } = useBeat();
  const y = Math.round(lerp(2026, 1368, prog(f, 0, dur * 0.75, 'inout')));
  return (
    <div style={{ position: 'absolute', left: 0, width: 1920, top: 420, textAlign: 'center', fontFamily: F.mono, fontSize: 220, color: fgText(mode), textShadow: '0 0 30px rgba(233,199,120,0.6)' }}>
      {y}
    </div>
  );
};

const ShareRing: React.FC = () => {
  const { f, mode } = useBeat();
  const p = prog(f, 10, 50, 'inout');
  const r = 230;
  const frac = 0.249 * p;
  const end = { x: Math.sin(frac * Math.PI * 2) * r, y: -Math.cos(frac * Math.PI * 2) * r };
  return (
    <Art>
      <g transform="translate(1380 560)">
        <circle r={r} strokeWidth={2} opacity={0.6} />
        <circle r={r - 40} strokeWidth={1} strokeDasharray="3 8" opacity={0.6} />
        <path d={`M0 ${-r} A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${end.x} ${end.y}`} stroke={accent(mode)} strokeWidth={40} strokeLinecap="butt" />
        <text x={0} y={30} textAnchor="middle" fill={accent(mode)} stroke="none" style={{ fontFamily: F.mono, fontSize: 96 }}>{(24.9 * p).toFixed(1)}%</text>
        <text x={0} y={90} textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: F.serif, fontWeight: 700, fontSize: 24, letterSpacing: '0.3em' }}>占世界经济</text>
      </g>
    </Art>
  );
};

export const SCENES: Record<string, Scene> = {
  open: () => (
    <>
      <Art><Armillary cx={960} cy={500} r={380} len={90} /></Art>
      <Caption text="大明 · 洪武元年" x={0} width={1920} align="center" y={920} at={40} />
    </>
  ),
  'q-ming': () => (
    <>
      <Art glow={false}><Armillary cx={960} cy={500} r={380} len={1} opacity={0.18} /></Art>
      <Headline lines={[[{ t: '假如', dim: true }], ['你能回到', { t: '明朝', a: true }]]} x={0} width={1920} align="center" y={330} size={140} />
    </>
  ),
  'q-bring': () => (
    <>
      <Art glow={false}><Armillary cx={960} cy={500} r={380} len={1} opacity={0.18} /></Art>
      <Headline lines={[[{ t: '带上', dim: true }], ['现代的', { t: '一切', a: true }, '。']]} x={0} width={1920} align="center" y={330} size={140} />
      <Caption text="知识 · 技术 · 组织" x={0} width={1920} align="center" y={720} at={24} />
    </>
  ),
  'q-what': () => (
    <>
      <Art glow={false}><Armillary cx={960} cy={500} r={380} len={1} opacity={0.18} /></Art>
      <Headline lines={[[{ t: '你会', dim: true }], [{ t: '做什么', a: true }, '？']]} x={0} width={1920} align="center" y={330} size={160} />
    </>
  ),
  emperor: () => (
    <>
      <Art><Throne x={1360} y={900} s={1.05} /></Art>
      <Headline lines={[[{ t: '当皇帝', strike: true }, '？']]} x={150} y={380} size={150} at={1} />
    </>
  ),
  poet: () => (
    <>
      <Art><Scroll x={1340} y={520} s={1.1} /></Art>
      <Headline lines={[[{ t: '写几首诗', strike: true }, '？']]} x={150} y={380} size={150} at={1} />
    </>
  ),
  steel: () => (
    <>
      <Art><Furnace x={1350} y={900} s={1.1} /><Embers x={1350} y={260} w={160} n={60} rise={300} /></Art>
      <Headline lines={[[{ t: '还是——', dim: true }], ['建一座'], [{ t: '钢铁厂', a: true }, '。']]} x={150} y={250} size={140} at={2} stagger={10} />
    </>
  ),
  title: () => (
    <>
      <Art glow={false}><Armillary cx={960} cy={520} r={470} len={1} opacity={0.22} spin={0.3} /></Art>
      <Art><MorningStar x={960} y={230} size={70} at={4} /><Embers x={960} y={760} w={900} n={70} rise={500} seed={3} /></Art>
      <Headline lines={['临高启明']} x={0} width={1920} align="center" y={360} size={210} at={10} stagger={5} />
      <Caption text="工 业 党 的 另 类 历 史" x={0} width={1920} align="center" y={640} at={36} size={30} />
      <Body lines={['如果穿越回明朝，能否避开“大分流”？']} x={0} width={1920} align="center" y={720} at={50} size={34} />
    </>
  ),

  'ming-found': () => (
    <>
      <Art><GateTower x={1320} y={930} s={0.85} /></Art>
      <Headline lines={[['1368，'], [{ t: '大明', a: true }, '开国。']]} x={150} y={170} size={120} />
      <Caption text="朱元璋 · 定都应天府（南京）" y={470} at={20} />
    </>
  ),
  'ming-rich': () => (
    <>
      <ShareRing />
      <Headline lines={[['人口最多，'], ['最', { t: '富庶', a: true }, '之一。']]} x={150} y={250} size={110} />
      <Caption text="1500 年前后 · 中国约占世界经济四分之一" y={560} at={20} />
      <Caption text="数据：麦迪森估算" y={610} at={28} size={18} />
    </>
  ),
  zhenghe: () => (
    <>
      <Art zoom={0.03}><ZhengHeMap at={4} /></Art>
      <Headline lines={[['郑和', { t: '七下西洋', a: true }, '。']]} x={380} y={800} size={84} at={10} />
      <Caption text="1405—1433 · 宝船船队 · 远达东非" x={390} y={912} at={26} size={20} />
    </>
  ),

  diverge: () => (
    <>
      <Art><DivergeChart x={820} y={290} w={860} h={500} /></Art>
      <Headline lines={[[{ t: '然后，', dim: true }], ['世界', { t: '分岔', a: true }, '了。']]} x={150} y={260} size={110} />
      <Caption text="十八、十九世纪 · 西欧崛起" y={560} at={24} />
    </>
  ),
  coal: () => <Word word="煤。" caption="1709 · 达比 · 焦炭炼铁"><Coal x={1330} y={820} s={1.1} /></Word>,
  steam: () => <Word word="蒸汽。" caption="1769 · 瓦特 · 蒸汽机专利"><BeamEngine x={1300} y={900} s={1.05} /></Word>,
  factory: () => <Word word="工厂。" caption="1771 · 阿克莱特 · 水力纺纱厂"><Mill x={1300} y={900} s={1.0} /></Word>,
  rail: () => <Word word="铁路。" caption="1825 · 斯托克顿—达灵顿铁路"><Locomotive x={1250} y={860} s={0.95} /></Word>,
  'great-div': () => (
    <>
      <Art><Rays cx={960} cy={560} r0={330} r1={1300} opacity={0.3} /></Art>
      <Headline lines={[[{ t: '历史学家称之为', dim: true }]]} x={0} width={1920} align="center" y={300} size={56} weight={700} />
      <Headline lines={[[{ t: '大分流', a: true }, '。']]} x={0} width={1920} align="center" y={400} size={250} at={14} />
      <Caption text="彭慕兰《大分流》· 2000" x={0} width={1920} align="center" y={760} at={34} />
    </>
  ),
  opium: () => (
    <>
      <Art><Warship x={1250} y={800} s={0.85} at={2} /></Art>
      <Headline lines={[['1840，'], ['差距再也'], [{ t: '无法回避', a: true }, '。']]} x={150} y={150} size={110} />
      <Caption text="鸦片战争 · 铁壳蒸汽战舰“复仇女神号”" y={560} at={30} />
    </>
  ),
  gdp: () => (
    <>
      <Art><GdpChart x={800} y={340} w={960} h={500} /></Art>
      <Headline lines={[['从', { t: '三分之一', a: true }], ['到', { t: '不足5%', a: true }, '。']]} x={150} y={180} size={92} />
      <Caption text="中国占世界经济总量" y={430} at={20} />
      <Caption text="1820 年 32.9% → 1950 年 4.5%" y={480} at={30} />
      <Caption text="数据：麦迪森估算" y={530} at={38} size={18} />
    </>
  ),

  whatif: () => (
    <>
      <Headline lines={[[{ t: '如果能回到过去——', dim: true }]]} x={0} width={1920} align="center" y={300} size={64} weight={700} />
      <Headline lines={[['能不能', { t: '避开', a: true }, '它？']]} x={0} width={1920} align="center" y={430} size={160} at={16} />
    </>
  ),
  novel: () => (
    <>
      <Art><NovelBook x={1330} y={560} s={0.95} /></Art>
      <Headline lines={[[{ t: '最著名的答案：', dim: true }], [{ t: '《临高启明》', a: true }]]} x={150} y={150} size={96} />
      <Caption text="网友接力创作的长篇网络小说" y={400} at={24} />
    </>
  ),
  'five-hundred': () => (
    <>
      <Art zoom={0.02}><Crowd cx={960} cy={820} /></Art>
      <Headline lines={[[{ t: '五百多名', a: true }, '现代人，穿越而来。']]} x={0} width={1920} align="center" y={100} size={84} />
      <Caption text="带着图纸、机器与现代知识" x={0} width={1920} align="center" y={230} at={24} />
    </>
  ),
  land: () => (
    <>
      <Art zoom={0.05}><HainanMap at={2} /></Art>
      <Headline lines={[['1628，'], ['崇祯元年，'], ['登陆', { t: '临高', a: true }, '。']]} x={150} y={200} size={100} />
      <Caption text="海南岛 · 西北海岸" y={580} at={30} />
    </>
  ),
  'not-emperor': () => (
    <Headline lines={[['他们不当', { t: '皇帝', strike: true }, '，'], ['也不写', { t: '诗', strike: true }, '。']]} x={0} width={1920} align="center" y={340} size={130} at={1} stagger={6} />
  ),
  survey: () => <Word word="勘探。" caption="测绘地形 · 寻找矿藏"><Theodolite x={1300} y={860} s={0.95} /></Word>,
  power: () => <Word word="发电。" caption="建起发电站"><PowerStation x={1180} y={880} s={0.9} /></Word>,
  iron: () => <Word word="炼铁。" caption="高炉 · 焦炭 · 钢"><Furnace x={1350} y={900} s={1.0} /></Word>,
  cement: () => <Word word="水泥。" caption="修港口 · 筑道路"><CementKiln x={1200} y={880} s={0.85} /></Word>,
  school: () => (
    <>
      <Art><SchoolPanels x={960} y={620} /></Art>
      <Headline lines={[[{ t: '组织', a: true }, '，也是一种技术。']]} x={0} width={1920} align="center" y={130} size={84} />
    </>
  ),
  workers: () => (
    <>
      <Art zoom={0}><Workers y={930} /></Art>
      <Headline lines={[['把一个个农民，'], ['训练成', { t: '工人', a: true }, '、技术员和士兵。']]} x={150} y={150} size={84} />
    </>
  ),
  system: () => (
    <>
      <Art zoom={0.02}><g transform="translate(130 150) scale(0.86)"><TechTree at={6} /></g></Art>
      <Headline lines={[['金手指不是某件发明，而是', { t: '整个工业体系', a: true }]]} x={0} width={1920} align="center" y={80} size={62} stagger={10} />
      <Caption text="机床造机床 · 工厂造工厂 · 教育与组织把技术变成力量" x={0} width={1920} align="center" y={900} at={90} />
    </>
  ),

  fantasy: () => (
    <Headline lines={[['这当然是', { t: '幻想', dim: true }, '，'], ['却也是一种', { t: '鞭策', a: true }, '。']]} x={0} width={1920} align="center" y={340} size={130} stagger={10} />
  ),
  'not-west': () => (
    <>
      <Art><Globe x={1380} y={540} s={0.95} highlight={0} /></Art>
      <Headline lines={[['它鞭策的，'], ['并不是', { t: '西方人', a: true }, '。']]} x={150} y={360} size={100} />
    </>
  ),
  unknown: () => (
    <>
      <LitGlobe />
      <Headline lines={[['民族主义色彩'], [{ t: '极其鲜明', a: true }, '。']]} x={150} y={300} size={100} />
      <Body lines={['但直到最近，', '西方几乎没有几个人听说过它。']} y={590} at={30} size={40} />
    </>
  ),
  party: () => (
    <>
      <Art glow={false}><Seal x={1400} y={540} size={300} text="工业党" at={16} /></Art>
      <Headline lines={[[{ t: '它的拥护者，', dim: true }], ['被称为'], [{ t: '工业党', a: true }, '。']]} x={150} y={220} size={120} />
    </>
  ),
  ladder: () => (
    <>
      <Art><Ladder x={1380} y={960} /></Art>
      <Headline lines={[['工业党'], ['不是', { t: '自由主义', a: true }], ['道德家。']]} x={150} y={200} size={110} />
      <Caption text="不预设一架“国际发展的天然阶梯”" y={600} at={34} />
    </>
  ),
  'no-yield': () => (
    <>
      <Headline lines={[[{ t: '也不追问：', dim: true }]]} x={0} width={1920} align="center" y={260} size={64} weight={700} />
      <Headline lines={[[{ t: '先行者为何不给后来者让路？', strike: true }]]} x={0} width={1920} align="center" y={400} size={92} at={12} />
      <Caption text="他们不期待别人让出空间" x={0} width={1920} align="center" y={620} at={50} />
    </>
  ),
  realpolitik: () => (
    <>
      <Art zoom={0.03}><Chessboard at={0} /></Art>
      <Headline lines={[[{ t: '现实政治', a: true }, '，理所当然。']]} x={0} width={1920} align="center" y={120} size={110} />
      <Caption text="全球经济发展的现实，本来如此" x={0} width={1920} align="center" y={290} at={26} />
    </>
  ),

  inward: () => (
    <>
      <Art><Spear x={960} y={560} at={4} /></Art>
      <Headline lines={[['工业党的', { t: '锋芒', a: true }]]} x={0} width={1920} align="center" y={170} size={110} />
      <Caption text="指 向 的 ， 是 中 国 同 胞" x={0} width={1920} align="center" y={820} at={60} size={36} />
    </>
  ),
  rivals: () => (
    <>
      <Rivals />
      <Headline lines={[['网络论战中，对手常被称作', { t: '情怀党', a: true }]]} x={0} width={1920} align="center" y={120} size={70} stagger={10} />
    </>
  ),
  slogan: () => (
    <>
      <Art><Rays cx={960} cy={540} r0={300} r1={1200} opacity={0.22} n={48} /></Art>
      <Headline lines={[[{ t: '他们的', dim: true }, { t: '战斗口号', a: true }, '：']]} x={0} width={1920} align="center" y={440} size={130} at={2} />
    </>
  ),
  quote1: () => (
    <>
      <Art><Road at={4} /></Art>
      <QuoteMark />
      <Headline lines={[['既然我们现在'], ['正开始', { t: '蓄积动力', a: true }, '，'], ['沿着自己的国家发展道路'], ['向前推进；']]} x={150} y={280} size={70} stagger={12} weight={700} lineHeight={1.35} />
    </>
  ),
  quote2: () => (
    <>
      <Art><SmileCurve x={1000} y={330} w={780} h={440} at={10} /></Art>
      <QuoteMark />
      <Headline lines={[['既然我们正在摆脱，'], ['即使在加入', { t: '世贸组织', a: true }], ['后最初几年，'], ['仍被安排给我们的'], [{ t: '劣势位置', a: true }, '；']]} x={150} y={260} size={66} stagger={12} weight={700} lineHeight={1.35} />
      <Caption text="2001 年 12 月 · 中国加入世界贸易组织" y={880} at={70} size={18} />
    </>
  ),
  quote3: () => (
    <>
      <FadingClouds />
      <QuoteMark />
      <Headline lines={[['那就'], [{ t: '不要迷失', a: true }, '在'], ['人文主义'], ['关于更美好未来的'], ['想象之中。']]} x={150} y={250} size={76} stagger={12} weight={700} lineHeight={1.35} />
    </>
  ),

  deng: () => (
    <>
      <Art><Embers x={960} y={900} w={1400} n={60} rise={420} seed={1992} /></Art>
      <Headline lines={[[{ t: '发展才是硬道理', brush: true }]]} x={0} width={1920} align="center" y={320} size={190} at={6} stagger={1} />
      <Art glow={false}><Seal x={1770} y={600} size={140} text="南方谈话" at={46} brush={false} /></Art>
      <Caption text="邓小平 · 1992 年南方谈话" x={0} width={1920} align="center" y={700} at={40} size={26} />
    </>
  ),
  embrace: () => (
    <>
      <Art><Embers x={960} y={1000} w={1600} n={50} rise={400} seed={77} /></Art>
      <Headline lines={[[{ t: '他们号召中国，', dim: true }], ['拥抱发展的', { t: '残酷真相', a: true }, '。']]} x={0} width={1920} align="center" y={360} size={110} stagger={10} />
    </>
  ),
  't-steel': () => <Word word="钢铁。" caption="比道德叙事更有分量"><IBeam x={1150} y={600} s={1.1} /></Word>,
  't-power': () => <Word word="电力。" caption="比道德叙事更有分量"><Pylon x={1350} y={960} s={1.1} /></Word>,
  't-lathe': () => <Word word="机床。" caption="比道德叙事更有分量"><Lathe x={1300} y={680} s={1.05} /></Word>,
  't-chip': () => <Word word="芯片。" caption="比道德叙事更有分量"><Chip x={1350} y={540} s={1.25} /></Word>,
  weight: () => (
    <>
      <Art><Balance x={1260} y={330} at={2} /></Art>
      <Headline lines={[['比任何'], ['宏大的道德叙事'], ['都更有', { t: '分量', a: true }, '。']]} x={150} y={240} size={90} />
    </>
  ),
  beaten: () => (
    <>
      <Art glow={false}><g opacity={0.35}><Warship x={960} y={880} s={0.8} at={-60} /></g></Art>
      <Headline lines={[['落后'], ['就要', { t: '挨打', a: true }, '。']]} x={0} width={1920} align="center" y={230} size={180} stagger={10} />
      <Caption text="一百多年近代史留下的集体记忆" x={0} width={1920} align="center" y={700} at={30} />
    </>
  ),
  now: () => (
    <>
      <Art zoom={0.02}><Skyline y={980} at={20} /></Art>
      <Headline lines={[[{ t: '所以，穿越明朝的故事，', dim: true }], ['讲的不是过去，'], ['而是', { t: '现在', a: true }, '。']]} x={150} y={130} size={96} stagger={12} />
    </>
  ),

  mirror: () => (
    <>
      <Art><BronzeMirror cx={1340} cy={520} r={360} /></Art>
      <Headline lines={[['它是'], [{ t: '一面镜子', a: true }, '。']]} x={150} y={220} size={120} />
      <Body lines={['映照出一代中国网民与工程师，', '如何理解历史上的失败，', '又如何想象国家的未来。']} y={560} at={36} size={38} width={800} />
    </>
  ),
  anxiety: () => (
    <>
      <Art glow={false}><g opacity={0.2}><BronzeMirror cx={960} cy={540} r={440} at={-200} /></g></Art>
      <Headline lines={[[{ t: '你可以不认同它的锋芒，', dim: true }]]} x={0} width={1920} align="center" y={300} size={72} weight={700} />
      <Headline lines={[['却很难忽视'], ['它的', { t: '焦虑', a: true }, '与', { t: '决心', a: true }, '。']]} x={0} width={1920} align="center" y={440} size={120} at={24} stagger={8} />
    </>
  ),
  rewind: () => (
    <>
      <Art><Armillary cx={960} cy={540} r={440} len={30} spin={9} /></Art>
      <RewindYear />
    </>
  ),
  question: () => (
    <>
      <Art><MorningStar x={960} y={240} size={80} at={2} /></Art>
      <Headline lines={[[{ t: '假如真能回到 1368 年，', dim: true }]]} x={0} width={1920} align="center" y={420} size={68} weight={700} />
      <Headline lines={[['你，会', { t: '带走什么', a: true }, '？']]} x={0} width={1920} align="center" y={540} size={150} at={22} stagger={10} />
    </>
  ),
  end: () => (
    <>
      <Art glow={false}><Armillary cx={960} cy={500} r={420} len={1} opacity={0.15} spin={0.2} /></Art>
      <Art><MorningStar x={960} y={290} size={34} at={0} /></Art>
      <Headline lines={['临高启明']} x={0} width={1920} align="center" y={360} size={120} at={4} stagger={4} />
      <Caption text="一 种 幻 想 ， 也 是 一 种 鞭 策" x={0} width={1920} align="center" y={540} at={16} size={26} />
      <Caption text="数据：安格斯·麦迪森《世界经济：历史统计》 · 部分图表为示意" x={0} width={1920} align="center" y={820} at={30} size={16} />
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
