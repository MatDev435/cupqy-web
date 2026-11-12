/**
 * Atualiza o snapshot do contrato a partir da API em execução:
 *   OPENAPI_URL=http://localhost:3333/api/docs/openapi.json npm run api:sync
 */
import { writeFile } from 'node:fs/promises';

const url = process.env.OPENAPI_URL ?? 'http://localhost:3333/api/docs/openapi.json';
const response = await fetch(url);
if (!response.ok) {
  console.error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  process.exit(1);
}
const spec = await response.json();
await writeFile('openapi/openapi.json', `${JSON.stringify(spec, null, 2)}\n`);
console.warn(`openapi/openapi.json atualizado (${Object.keys(spec.paths ?? {}).length} rotas).`);
