import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://zabankadeh:zabankadeh@localhost:5433/zabankadeh",
    max: 10,
  });

  query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
    return this.pool.query<T>(text, values);
  }

  async onModuleInit() {
    await this.pool.query("create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())");
    const migrations = [
      ["20260722_add_admin_workflow_columns", "alter table people add column if not exists gender text check (gender in ('female','male','other')); alter table classes add column if not exists class_type text not null default 'in_person' check (class_type in ('in_person','online','hybrid')); alter table assessment_attempts add column if not exists override_band text; alter table assessment_attempts add column if not exists override_reason text; alter table assessment_attempts add column if not exists student_id uuid references students(id);"],
      ["20260722_link_assessment_leads", "alter table assessment_attempts add column if not exists student_id uuid references students(id);"],
    ] as const;
    const client = await this.pool.connect();
    try {
      await client.query("select pg_advisory_lock($1)", [481729]);
      for (const [id, sql] of migrations) {
        const applied = await client.query("select 1 from schema_migrations where id = $1", [id]);
        if (applied.rowCount) continue;
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into schema_migrations (id) values ($1)", [id]);
        await client.query("commit");
      }
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      await client.query("select pg_advisory_unlock($1)", [481729]).catch(() => undefined);
      client.release();
    }
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
