import express from 'express';
import cors from 'cors';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const renderTasks = new Map();

app.post('/api/render', async (req, res) => {
  try {
    const { projectData, config } = req.body;

    if (!projectData) {
      return res.status(400).json({ error: 'Missing project data' });
    }

    const taskId = 'task-' + Date.now();

    console.log('[RenderServer] Render request received:', taskId);
    console.log('[RenderServer] Config:', config);

    renderTasks.set(taskId, {
      id: taskId,
      status: 'queued',
      progress: 0,
      renderedFrames: 0,
      totalFrames: 0,
      createdAt: Date.now(),
    });

    renderVideo(taskId, projectData, config).catch((error) => {
      console.error('[RenderServer] Render failed:', error);
      renderTasks.set(taskId, {
        ...renderTasks.get(taskId),
        status: 'failed',
        error: error.message,
      });
    });

    res.json({
      success: true,
      taskId,
      message: 'Render task created',
    });

  } catch (error) {
    console.error('[RenderServer] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/render/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = renderTasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

app.get('/api/render/:taskId/download', async (req, res) => {
  const { taskId } = req.params;
  const task = renderTasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status !== 'completed') {
    return res.status(400).json({ error: 'Video not ready' });
  }

  if (!task.outputPath) {
    return res.status(500).json({ error: 'Output file not found' });
  }

  res.download(task.outputPath);
});

async function renderVideo(taskId, projectData, config) {
  const task = renderTasks.get(taskId);

  try {
    task.status = 'bundling';
    console.log('[RenderServer] Bundling code...');

    const bundleLocation = await bundle({
      entryPoint: join(__dirname, 'src/remotion/Root.tsx'),
      webpackOverride: (config) => config,
    });

    console.log('[RenderServer] Bundle complete:', bundleLocation);

    task.status = 'selecting';
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'SVGVideoComposition',
      inputProps: projectData,
    });

    console.log('[RenderServer] Composition info:', composition);

    task.status = 'rendering';
    task.totalFrames = composition.durationInFrames || 0;

    const outputPath = join(__dirname, 'output', taskId + '.mp4');

    await fs.mkdir(join(__dirname, 'output'), { recursive: true });

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: config?.codec || 'h264',
      outputLocation: outputPath,
      inputProps: projectData,
      onProgress: ({ renderedFrames, encodedFrames, totalFrames }) => {
        const safeRenderedFrames = renderedFrames || 0;
        const safeTotalFrames = totalFrames || composition.durationInFrames || 1;
        const progress = Math.round((safeRenderedFrames / safeTotalFrames) * 100);

        task.progress = progress;
        task.renderedFrames = safeRenderedFrames;
        task.totalFrames = safeTotalFrames;

        console.log('[RenderServer] Progress:', progress + '%', `(${safeRenderedFrames}/${safeTotalFrames} frames)`);
      },
    });

    task.status = 'completed';
    task.progress = 100;
    task.outputPath = outputPath;
    task.completedAt = Date.now();

    console.log('[RenderServer] ✅ Render complete:', outputPath);

  } catch (error) {
    console.error('[RenderServer] ❌ Render failed:', error);
    task.status = 'failed';
    task.error = error.message;
    throw error;
  }
}

app.listen(PORT, () => {
  console.log('\n🎬 Remotion Render Server Started');
  console.log('📍 Address: http://localhost:' + PORT);
  console.log('📋 API Endpoints:');
  console.log('   POST   /api/render              - Submit render task');
  console.log('   GET    /api/render/:taskId      - Check render progress');
  console.log('   GET    /api/render/:taskId/download - Download video');
  console.log('\nWaiting for render requests...\n');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Render server is running' });
});
