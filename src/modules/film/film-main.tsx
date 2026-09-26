import React, { useEffect, useRef, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { ArrowLeft, Film } from 'lucide-react';
import { FPS, FatherAndSon, SCENES, TOTAL_FRAMES, sceneStart } from '../../films/father-and-son/FatherAndSon';

/** Chapter names shown beside the player; the solar terms match the cards inside the film. */
const CHAPTERS: Record<string, { zh: string; en: string }> = {
  title: { zh: '片头', en: 'Title' },
  parting: { zh: '离别', en: 'The parting' },
  spring: { zh: '清明', en: 'Clear and bright' },
  summer: { zh: '夏至', en: 'Summer solstice' },
  autumn: { zh: '秋分', en: 'Autumn equinox' },
  winter: { zh: '大雪', en: 'Heavy snow' },
  youth: { zh: '立夏', en: 'Start of summer' },
  courtship: { zh: '小暑', en: 'Minor heat' },
  fatherhood: { zh: '寒露', en: 'Cold dew' },
  oldAge: { zh: '霜降', en: 'Frost descends' },
  drought: { zh: '大寒', en: 'Great cold' },
  reunion: { zh: '立春', en: 'Start of spring' },
  epilogue: { zh: '尾声', en: 'Epilogue' },
  credits: { zh: '字幕', en: 'Credits' },
};

const clock = (frame: number) => {
  const s = Math.floor(frame / FPS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** `?t=95` opens the film at 1:35. */
const startFrame = () => {
  const t = Number(new URLSearchParams(window.location.search).get('t'));
  return Number.isFinite(t) && t > 0 ? Math.min(TOTAL_FRAMES - 1, Math.round(t * FPS)) : 0;
};

export const FilmMain: React.FC = () => {
  const player = useRef<PlayerRef>(null);
  const [initialFrame] = useState(startFrame);
  const [frame, setFrame] = useState(initialFrame);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    p.addEventListener('frameupdate', onFrame);
    return () => p.removeEventListener('frameupdate', onFrame);
  }, []);

  const current = SCENES.reduce((id, s) => (frame >= sceneStart(s.id) ? s.id : id), SCENES[0].id);

  return (
    <div className="min-h-screen bg-[#1f1912] text-[#efe3c8]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-[#c9b48a] transition-colors hover:text-[#efe3c8]">
            <ArrowLeft size={16} />
            SVG 视频生成器
          </a>
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#a08660]">
            <Film size={14} />
            {clock(TOTAL_FRAMES)} · 1920×1080 · {FPS} fps
          </span>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="overflow-hidden rounded-lg shadow-2xl shadow-black/60 ring-1 ring-[#efe3c8]/10">
              <Player
                ref={player}
                component={FatherAndSon}
                durationInFrames={TOTAL_FRAMES}
                fps={FPS}
                compositionWidth={1920}
                compositionHeight={1080}
                style={{ width: '100%', aspectRatio: '16 / 9' }}
                initialFrame={initialFrame}
                controls
                clickToPlay
              />
            </div>
            <div className="mt-8 max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-wide md:text-5xl">
                父与子 <span className="ml-2 text-2xl font-light text-[#c9b48a] md:text-3xl">Father and Son</span>
              </h1>
              <p className="mt-4 leading-relaxed text-[#d8c7a0]">
                A father cycles his small son along a river dike lined with poplars, breaks a willow switch for him — 折柳, the old Chinese
                farewell — and sculls away into the haze. The boy plants the switch on the dike. Through rain, kites, geese and snow, through
                school friends, a sweetheart on the back rack and a son of his own on the crossbar, he keeps coming back as the willow grows.
                When he is old the river has dried to reeds, and there he finds the boat.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[#a08660]">
                An homage to Michaël Dudok de Wit's Academy Award–winning short <em>Father and Daughter</em> (2000). Every frame is SVG drawn
                from code — figures, bicycles, trees and weather are procedural rigs — and the pentatonic waltz is synthesised in code too.
              </p>
            </div>
          </div>

          <nav aria-label="Chapters" className="lg:pt-1">
            <h2 className="mb-3 text-xs uppercase tracking-[0.3em] text-[#a08660]">章节 · Chapters</h2>
            <ol className="space-y-1">
              {SCENES.map((s) => {
                const c = CHAPTERS[s.id];
                const start = sceneStart(s.id);
                const active = s.id === current;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        player.current?.seekTo(start);
                        player.current?.play();
                      }}
                      className={`flex w-full items-baseline gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                        active ? 'bg-[#efe3c8]/10 text-[#efe3c8]' : 'text-[#c9b48a] hover:bg-[#efe3c8]/5 hover:text-[#efe3c8]'
                      }`}
                    >
                      <span className="w-10 shrink-0 font-mono text-xs text-[#a08660]">{clock(start)}</span>
                      <span className="text-lg">{c.zh}</span>
                      <span className="truncate text-xs text-[#a08660]">{c.en}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
};
