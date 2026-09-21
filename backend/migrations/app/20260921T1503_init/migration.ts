#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d65197d11ce9ab407b994bcd0089b64b76c3733304ea7a7b8fb61be0c712acd4/contract';
import endContract from '../../snapshots/d65197d11ce9ab407b994bcd0089b64b76c3733304ea7a7b8fb61be0c712acd4/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'developer',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'developer_skill',
        columns: [
          col('developer_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('skill_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['developer_id', 'skill_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'skill',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'task',
        columns: [
          col('assignee_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('parent_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('TODO'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('task_status_check_ffceb8a5', "\"status\" IN ('TODO', 'DONE')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'task_skill',
        columns: [
          col('skill_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('task_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['task_id', 'skill_id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'skill',
        constraint: 'skill_name_key',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'developer_skill',
        index: 'developer_skill_developer_id_idx_9a0e0c4b',
        columns: ['developer_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'developer_skill',
        index: 'developer_skill_skill_id_idx_676c8389',
        columns: ['skill_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'task',
        index: 'task_assignee_id_idx_d45afe9c',
        columns: ['assignee_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'task',
        index: 'task_parent_id_idx_ab33b399',
        columns: ['parent_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'task_skill',
        index: 'task_skill_skill_id_idx_676c8389',
        columns: ['skill_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'task_skill',
        index: 'task_skill_task_id_idx_5d5ac774',
        columns: ['task_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'developer_skill',
        foreignKey: {
          name: 'developer_skill_developer_id_fkey',
          columns: ['developer_id'],
          references: { schema: 'public', table: 'developer', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'developer_skill',
        foreignKey: {
          name: 'developer_skill_skill_id_fkey',
          columns: ['skill_id'],
          references: { schema: 'public', table: 'skill', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'task',
        foreignKey: {
          name: 'task_assignee_id_fkey',
          columns: ['assignee_id'],
          references: { schema: 'public', table: 'developer', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'task',
        foreignKey: {
          name: 'task_parent_id_fkey',
          columns: ['parent_id'],
          references: { schema: 'public', table: 'task', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'task_skill',
        foreignKey: {
          name: 'task_skill_task_id_fkey',
          columns: ['task_id'],
          references: { schema: 'public', table: 'task', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'task_skill',
        foreignKey: {
          name: 'task_skill_skill_id_fkey',
          columns: ['skill_id'],
          references: { schema: 'public', table: 'skill', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
