// news-image-20261124 — "The World in One Day — Tuesday 24 November 2026".
//
// Entrypoint (Node 22, standard library only). The image is the entry.png
// sitting beside this file; the program copies it, byte for byte, to
// $MAKEFUN_OUTPUT_DIR/entry.png (falling back to /output/entry.png).
//
// Deterministic: every run writes the same bytes — the file is copied, never
// redrawn. The output folder itself is never deleted or recreated (the grader
// runs as a non-root user in a read-only repo, where deleting /output fails
// with EACCES); only its contents are cleared, and the folder is created
// when it does not exist yet.

import { copyFileSync, existsSync, mkdirSync, openSync, readSync, closeSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1_048_576; // 1 MiB — the bounty gate's size limit.
const SOURCE_NAME = 'entry.png';
// A PNG's first eight bytes, per the PNG spec; the gate tells PNG from JPEG
// by these, so a file that lost them is not a whole image any more.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(message: string): never {
  console.error(`news-image-20261124: ${message}`);
  process.exit(1);
}

function clearContents(dir: string): void {
  for (const name of readdirSync(dir)) {
    // Remove each entry inside the folder, never the folder itself.
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function main(): void {
  const source = join(dirname(fileURLToPath(import.meta.url)), SOURCE_NAME);

  if (!existsSync(source)) {
    fail(`source image missing: ${source}`);
  }
  const size = statSync(source).size;
  if (size > MAX_BYTES) {
    fail(`source image is ${size} bytes, over the ${MAX_BYTES}-byte limit`);
  }
  if (size < PNG_SIGNATURE.length) {
    fail(`source image is only ${size} bytes, too small to be a PNG`);
  }
  const fd = openSync(source, 'r');
  try {
    const head = Buffer.alloc(PNG_SIGNATURE.length);
    if (readSync(fd, head, 0, head.length, 0) !== head.length || !head.equals(PNG_SIGNATURE)) {
      fail('source image is not a PNG (bad magic bytes)');
    }
  } finally {
    closeSync(fd);
  }

  const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
  try {
    mkdirSync(outDir, { recursive: true });
  } catch (err) {
    fail(`cannot create output directory ${outDir}: ${(err as Error).message}`);
  }
  clearContents(outDir);

  const dest = join(outDir, SOURCE_NAME);
  if (existsSync(dest)) {
    // clearContents above should have removed it; refuse to clobber a
    // directory (or anything unexpected) that somehow survived.
    fail(`destination ${dest} still exists after clearing ${outDir}`);
  }
  copyFileSync(source, dest);

  // Confirm the copy landed whole before reporting success.
  const written = statSync(dest).size;
  if (written !== size) {
    fail(`copied ${written} bytes, expected ${size}`);
  }
  console.log(`wrote ${dest} (${written} bytes)`);
}

main();
