import { pool } from "@workspace/db";

type AnyRecord = Record<string, unknown>;
type QueryFn = (sql: string, params?: unknown[]) => Promise<{ rows: AnyRecord[]; rowCount?: number }>;

/** Convert MySQL/SQLite-style ? placeholders to PostgreSQL $1, $2, … */
function convertPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function buildWhereClause(where: AnyRecord) {
  const keys = Object.keys(where);
  if (keys.length === 0) return { clause: "", values: [] as unknown[] };
  const clause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(" AND ");
  return { clause: ` WHERE ${clause}`, values: keys.map((k) => where[k]) };
}

function buildAdapter(queryFn: QueryFn): LedgerAdapter {
  const adapter: LedgerAdapter = {
    dialect: "postgres" as const,

    async query(sql: string, params?: unknown[]) {
      const converted = convertPlaceholders(sql);
      const r = await queryFn(converted, params);
      // ledgerstack-core checks result.rowCount — return the full result object
      return Object.assign(r.rows, { rowCount: r.rowCount ?? r.rows.length });
    },

    async select(table: string, where: AnyRecord = {}) {
      const { clause, values } = buildWhereClause(where);
      const r = await queryFn(`SELECT * FROM "${table}"${clause}`, values);
      return r.rows;
    },

    async insert(table: string, data: AnyRecord) {
      const keys = Object.keys(data);
      const cols = keys.map((k) => `"${k}"`).join(", ");
      const ph = keys.map((_, i) => `$${i + 1}`).join(", ");
      const r = await queryFn(
        `INSERT INTO "${table}" (${cols}) VALUES (${ph}) RETURNING *`,
        keys.map((k) => data[k])
      );
      return r.rows[0];
    },

    async update(table: string, where: AnyRecord, data: AnyRecord) {
      const dk = Object.keys(data);
      const wk = Object.keys(where);
      const set = dk.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
      const cond = wk.map((k, i) => `"${k}" = $${dk.length + i + 1}`).join(" AND ");
      const vals = [...dk.map((k) => data[k]), ...wk.map((k) => where[k])];
      const r = await queryFn(`UPDATE "${table}" SET ${set} WHERE ${cond} RETURNING *`, vals);
      return r.rows[0];
    },

    async delete(table: string, where: AnyRecord) {
      const { clause, values } = buildWhereClause(where);
      await queryFn(`DELETE FROM "${table}"${clause}`, values);
    },

    async transaction(fn: (txAdapter: LedgerAdapter) => Promise<unknown>) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const txFn: QueryFn = async (sql, params) => {
          const r = await client.query(sql as string, (params as unknown[]) || []);
          return { rows: r.rows as AnyRecord[], rowCount: r.rowCount ?? r.rows.length };
        };
        const txAdapter = buildAdapter(txFn);
        const result = await fn(txAdapter);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
  return adapter;
}

export interface LedgerAdapter {
  dialect: "postgres";
  query(sql: string, params?: unknown[]): Promise<AnyRecord[]>;
  select(table: string, where?: AnyRecord): Promise<AnyRecord[]>;
  insert(table: string, data: AnyRecord): Promise<AnyRecord>;
  update(table: string, where: AnyRecord, data: AnyRecord): Promise<AnyRecord>;
  delete(table: string, where: AnyRecord): Promise<void>;
  transaction(fn: (txAdapter: LedgerAdapter) => Promise<unknown>): Promise<unknown>;
}

export function createLedgerAdapter(): LedgerAdapter {
  return buildAdapter(async (sql, params) => {
    const r = await pool.query(sql as string, (params as unknown[]) || []);
    return { rows: r.rows as AnyRecord[], rowCount: r.rowCount ?? r.rows.length };
  });
}
