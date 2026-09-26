import { M, MAN } from './lib/stage';
import { Build, blendBuild, makeBuild } from './rig/skeleton';

/** The father: conical bamboo hat, work jacket. */
export const FATHER = makeBuild('man', MAN, { hat: 'douli' });

/** The son at each age. Heights are relative to a grown man. */
export const SON = {
  small: makeBuild('boy', MAN * 0.64),
  child: makeBuild('boy', MAN * 0.7),
  winter: makeBuild('boy', MAN * 0.72, { garment: 'padded', hat: 'hood' }),
  teen: makeBuild('teen', MAN * 0.95, { satchel: true }),
  young: makeBuild('man', MAN * 1.0),
  grown: makeBuild('man', MAN * 1.0, { hat: 'cap' }),
  old: makeBuild('elder', MAN * 0.95, { garment: 'coat', hat: 'cap' }),
};

/** His grandson: the next small boy on the crossbar. */
export const GRANDSON = makeBuild('boy', MAN * 0.62);
export const WIFE = makeBuild('woman', MAN * 0.95);
export const FRIEND_A = makeBuild('teen', MAN * 0.93, { satchel: true });
export const FRIEND_B = makeBuild('teen', MAN * 0.9, { satchel: true, hair: 'braids', garment: 'dress' });

/** Grown-man bicycle scale, pixels per metre. */
export const BIKE_M = M;

/** Old → young, for the last run across the riverbed. */
export const sonAt = (age: number): Build => {
  // age: 0 = old man, 1 = small boy.
  const stops: Build[] = [SON.old, SON.grown, SON.young, SON.teen, SON.small];
  const f = Math.max(0, Math.min(0.9999, age)) * (stops.length - 1);
  const i = Math.floor(f);
  const b = blendBuild(stops[i], stops[i + 1], f - i);
  return { ...b, hat: f < 1.5 ? 'cap' : 'none', garment: f < 0.5 ? 'coat' : 'jacket', satchel: false };
};
