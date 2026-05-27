const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node run_workflow_args.js <run|submit> <workflow_id> <args_json_file> [extra_comfyui_skill_args...]');
  console.error('Example: node run_workflow_args.js run local/anima-txt2img-aesthetic-lora batch_args/job_01.json');
  console.error('Example: node run_workflow_args.js run local/anima-txt2img-aesthetic-lora batch_args/job_01.json --priority -1');
}

const [, , mode, workflowId, argsFile, ...extraArgs] = process.argv;

if (!mode || !workflowId || !argsFile || !['run', 'submit'].includes(mode)) {
  usage();
  process.exit(2);
}

const workspace = __dirname;
const resolvedArgsFile = path.resolve(workspace, argsFile);

let argsJson;
try {
  argsJson = JSON.stringify(JSON.parse(fs.readFileSync(resolvedArgsFile, 'utf8')));
} catch (error) {
  console.error(`[run_workflow_args] Failed to read/parse args JSON: ${resolvedArgsFile}`);
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
}

const child = spawn(
  'comfyui-skill',
  ['--json', mode, workflowId, `--args=${argsJson}`, ...extraArgs],
  {
    cwd: workspace,
    stdio: 'inherit',
    shell: false,
  },
);

child.on('close', (code) => {
  process.exit(code ?? 1);
});
