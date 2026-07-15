import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (global.__pgPool) return global.__pgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local");
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

  if (process.env.NODE_ENV !== "production") {
    global.__pgPool = pool;
  } else {
    global.__pgPool = pool;
  }
  return pool;
}

export const pool = {
  connect: () => getPool().connect(),
  query: ((...args: Parameters<Pool["query"]>) => getPool().query(...args)) as Pool["query"],
  end: () => getPool().end(),
};

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeRow<T extends QueryResultRow>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const key of Object.keys(out)) {
    out[key] = normalizeValue(out[key]);
  }
  return out as T;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: PoolClient
): Promise<T[]> {
  const runner = client ?? getPool();
  const result = await runner.query<T>(text, params);
  return result.rows.map((row) => normalizeRow(row));
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: PoolClient
): Promise<T | undefined> {
  const rows = await query<T>(text, params, client);
  return rows[0];
}

export async function execute(
  text: string,
  params: unknown[] = [],
  client?: PoolClient
): Promise<{ rowCount: number; rows: QueryResultRow[] }> {
  const runner = client ?? getPool();
  const result = await runner.query(text, params);
  return {
    rowCount: result.rowCount ?? 0,
    rows: result.rows.map((row) => normalizeRow(row)),
  };
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
