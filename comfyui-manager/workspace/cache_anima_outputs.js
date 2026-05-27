const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const workspace = __dirname;
const workflowId = 'local/anima-txt2img-aesthetic-lora';
const historyDir = path.join(workspace, 'data', 'local', 'anima-txt2img-aesthetic-lora', 'history');

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function normalizeDate(value) {
  return String(value || '').replace(/[^\d-]/g, '').slice(0, 10);
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function findOutputRoot() {
  const fromArg = argValue('--output-root');
  if (fromArg) return path.resolve(fromArg);
  if (process.env.COMFYUI_OUTPUT_DIR) return path.resolve(process.env.COMFYUI_OUTPUT_DIR);

  const candidates = [
    path.resolve(workspace, '..', '..', '..', '..', 'ComfyUI', 'output'),
    'H:/stableDiffusion/ComfyUI-aki-v1.6/ComfyUI/output',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Cannot find ComfyUI output dir. Pass --output-root or set COMFYUI_OUTPUT_DIR.');
}

function outputPath(outputRoot, preview) {
  const subfolder = preview.subfolder ? String(preview.subfolder) : '';
  return path.join(outputRoot, subfolder, preview.filename);
}

function cacheOne(job, outputRoot) {
  const preview = job.preview_output;
  if (!preview || !preview.filename) {
    return { id: job.id, cached: false, reason: 'missing preview_output' };
  }

  const source = outputPath(outputRoot, preview);
  if (!fs.existsSync(source)) {
    return { id: job.id, cached: false, reason: `source not found: ${source}` };
  }

  const dateFromSubfolder = /(\d{4}-\d{2}-\d{2})/.exec(String(preview.subfolder || ''));
  const date = normalizeDate(argValue('--date')) || (dateFromSubfolder ? dateFromSubfolder[1] : new Date().toISOString().slice(0, 10));
  const cacheDir = path.join(workspace, 'cache', 'anima', date);
  mkdirp(cacheDir);

  const imageCachePath = path.join(cacheDir, preview.filename);
  if (path.resolve(source).toLowerCase() !== path.resolve(imageCachePath).toLowerCase()) {
    fs.copyFileSync(source, imageCachePath);
  }

  const localHistoryPath = path.join(historyDir, `${job.id}.json`);
  const localHistory = readJson(localHistoryPath);
  const args = localHistory && localHistory.args ? localHistory.args : {};
  const stem = path.basename(preview.filename, path.extname(preview.filename));
  const argsPath = path.join(cacheDir, `${stem}.args.json`);
  const manifestPath = path.join(cacheDir, `${stem}.manifest.json`);

  writeJson(argsPath, args);
  writeJson(manifestPath, {
    workflow_id: workflowId,
    prompt_id: job.id,
    status: job.status,
    source_local_path: source,
    cache_local_path: imageCachePath,
    args_path: argsPath,
    filename_prefix: args.filename_prefix || '',
    created_at: new Date().toISOString(),
    preview_output: preview,
    local_history_path: fs.existsSync(localHistoryPath) ? localHistoryPath : '',
  });

  return { id: job.id, cached: true, cache_local_path: imageCachePath, args_path: argsPath, manifest_path: manifestPath };
}

function main() {
  const limit = Number.parseInt(argValue('--limit', '50'), 10) || 50;
  const outputRoot = findOutputRoot();
  const raw = execFileSync('comfyui-skill', ['history', 'list', workflowId, '--server', '--limit', String(limit)], {
    cwd: workspace,
    encoding: 'utf8',
    env: process.env,
  });
  const data = JSON.parse(raw);
  const jobs = Array.isArray(data.jobs) ? data.jobs.filter((job) => job.status === 'completed') : [];
  const results = jobs.map((job) => cacheOne(job, outputRoot));
  console.log(JSON.stringify({
    output_root: outputRoot,
    total_completed_seen: jobs.length,
    cached: results.filter((item) => item.cached).length,
    failed: results.filter((item) => !item.cached).length,
    results,
  }, null, 2));
}

main();
