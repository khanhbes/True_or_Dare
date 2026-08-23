/// <reference types="@cloudflare/workers-types" />

import { createCatalogBackup, pruneBackups } from '../functions/_shared/backup';
import type { CloudflareEnv } from '../functions/_shared/types';

const scheduledId = (scheduledTime: number): string =>
  `scheduled-${new Date(scheduledTime).toISOString().slice(0, 10)}`;

export default {
  async fetch(): Promise<Response> {
    return new Response('Not Found', { status: 404 });
  },
  async scheduled(controller: ScheduledController, env: CloudflareEnv): Promise<void> {
    const id = scheduledId(controller.scheduledTime);
    const existing = await env.DB.prepare('SELECT id FROM backup_runs WHERE id = ?').bind(id).first();
    if (existing) {
      controller.noRetry();
      return;
    }
    const date = new Date(controller.scheduledTime);
    const kind = date.getUTCDay() === 0 ? 'weekly' : 'daily';
    await createCatalogBackup(env, kind, id);
    await pruneBackups(env, controller.scheduledTime);
  },
} satisfies ExportedHandler<CloudflareEnv>;

