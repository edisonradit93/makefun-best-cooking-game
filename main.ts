import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot: string = fileURLToPath(new URL('.', import.meta.url));
const outDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

async function copyIfExists(src: string, dest: string): Promise<boolean> {
  try {
    await stat(src);
    await cp(src, dest, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

async function run(): Promise<void> {
  const gameDir = join(repoRoot, 'game');
  await stat(join(gameDir, 'index.html'));

  await mkdir(outDir, { recursive: true });
  await mkdir(join(outDir, 'screenshots'), { recursive: true });

  await copyIfExists(gameDir, join(outDir, 'game'));
  await copyIfExists(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

  const dossier = await Promise.resolve(
    buildDossier(outDir, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      game_max_files: 993,
      game_max_bytes: 50331648,
      game_path_max_bytes: 1000,
    }),
  );

  if (dossier !== undefined) {
    await writeFile(
      join(outDir, 'dossier.json'),
      JSON.stringify(dossier, null, 2),
      'utf8',
    );
  }
}

await run();

