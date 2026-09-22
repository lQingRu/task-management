#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9122ec690d7b09d5fb9266b894b1785cfb5f0a6f98989268a1f82aa33e92e507/contract';
import endContract from '../../snapshots/9122ec690d7b09d5fb9266b894b1785cfb5f0a6f98989268a1f82aa33e92e507/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d65197d11ce9ab407b994bcd0089b64b76c3733304ea7a7b8fb61be0c712acd4/contract';
import startContract from '../../snapshots/d65197d11ce9ab407b994bcd0089b64b76c3733304ea7a7b8fb61be0c712acd4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'task',
        constraint: 'task_status_check_ffceb8a5',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'task',
        constraint: 'task_status_check_b2033264',
        expression: "\"status\" IN ('TODO', 'IN_PROGRESS', 'DONE')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
