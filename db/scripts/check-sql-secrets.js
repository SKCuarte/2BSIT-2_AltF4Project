const { execFileSync } = require('node:child_process');

const scanTracked = process.argv.includes('--all');

const forbiddenPaths = [/^db\/seeds\/team\.csv$/, /(^|\/)\.env(\.(?!example$)[^/]+)?$/];
const rules = [
  { name: 'bcrypt hash', pattern: /\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}/ },
  { name: 'Argon2 hash', pattern: /\$argon2(?:id|i|d)\$/i },
  { name: 'password assignment', pattern: /\bpassword\s*=/i },
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const files = (scanTracked ? git(['ls-files']) : git(['diff', '--cached', '--name-only', '--diff-filter=ACM']))
  .split('\n')
  .filter(Boolean);

const failures = [];
for (const file of files) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    failures.push(`${file}: this file must never be committed`);
    continue;
  }
  if (!file.toLowerCase().endsWith('.sql')) continue;
  git(['show', `:${file}`])
    .split('\n')
    .forEach((line, index) => {
      for (const rule of rules) {
        if (rule.pattern.test(line)) failures.push(`${file}:${index + 1}: ${rule.name}`);
      }
    });
}

if (failures.length) {
  console.error('Secret check failed (matched text is not printed):');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}
console.log(`Secret check passed for ${files.length} file(s).`);
