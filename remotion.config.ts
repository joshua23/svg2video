import { Config } from '@remotion/cli/config';

Config.setConcurrency(4);
Config.setCodec('h264');
Config.setVideoImageFormat('jpeg');
Config.setStillImageFormat('png');
Config.setOverwriteOutput(true);
Config.setJpegQuality(80);
Config.setPublicDir('./public');
Config.setEntryPoint('./src/remotion/Root.tsx');
