/** Base Supabase simulée en mémoire pour tester le moteur de rappels (scripts/test-reminders-*.ts). */
export type Row = Record<string, any>;
export function createMock(initial: Record<string, Row[]>) {
  const state: Record<string, Row[]> & { [k: string]: Row[] } = new Proxy({ ...initial } as Record<string, Row[]>, {
    get: (t, k: string) => (t[k] ??= []),
  });
  let seq = 0;
  const T = (t: string): Row[] => (state[t] ??= []);
  const client: any = {
    _state: state,
    auth: { getUser: async () => ({ data: { user: null } }), admin: { getUserById: async () => ({ data: { user: null } }) } },
    rpc: async () => ({ data: null, error: null }),
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      let upd: Row | null = null;
      let ins: Row[] | null = null;
      let del = false;
      let onConflict: string | null = null;
      const chain: any = {
        select: () => chain,
        update: (v: Row) => ((upd = v), chain),
        delete: () => ((del = true), chain),
        insert: (v: Row | Row[]) => ((ins = Array.isArray(v) ? v : [v]), chain),
        upsert: (v: Row | Row[], o?: { onConflict?: string }) => ((ins = Array.isArray(v) ? v : [v]), (onConflict = o?.onConflict ?? null), chain),
        limit: () => chain,
        order: () => chain,
        or: () => chain,
        eq: (c: string, v: any) => (filters.push((r) => r[c] === v), chain),
        neq: (c: string, v: any) => (filters.push((r) => r[c] !== v), chain),
        in: (c: string, v: any[]) => (filters.push((r) => v.includes(r[c])), chain),
        not: (c: string, op: string, v: any) => (op === "is" && v === null && filters.push((r) => r[c] != null), chain),
        gte: (c: string, v: any) => (filters.push((r) => r[c] >= v), chain),
        lte: (c: string, v: any) => (filters.push((r) => r[c] <= v), chain),
        gt: (c: string, v: any) => (filters.push((r) => r[c] > v), chain),
        lt: (c: string, v: any) => (filters.push((r) => r[c] < v), chain),
        contains: (c: string, v: Row) => (filters.push((r) => Object.entries(v).every(([k, x]) => r[c]?.[k] === x)), chain),
        maybeSingle: async () => ({ data: T(table).find((r) => filters.every((f) => f(r))) ?? null, error: null }),
        single: async () => ({ data: T(table).find((r) => filters.every((f) => f(r))) ?? null, error: null }),
        then(resolve: any, reject?: any) {
          try {
            if (ins) {
              const out: Row[] = [];
              for (const r of ins) {
                // Clé unique (user_id, idempotency_key) : un doublon est ignoré, comme en base
                if (onConflict && T(table).some((x) => x.user_id === r.user_id && x.idempotency_key === r.idempotency_key)) continue;
                const row = { id: r.id ?? `gen-${++seq}`, created_at: new Date().toISOString(), ...r };
                T(table).push(row);
                out.push(row);
              }
              return Promise.resolve({ data: out, error: null }).then(resolve);
            }
            const matched = T(table).filter((r) => filters.every((f) => f(r)));
            if (upd) {
              matched.forEach((r) => Object.assign(r, upd));
              return Promise.resolve({ data: matched, error: null }).then(resolve);
            }
            if (del) {
              const keep = T(table).filter((r) => !matched.includes(r));
              T(table).length = 0;
              T(table).push(...keep);
              return Promise.resolve({ data: matched, error: null }).then(resolve);
            }
            return Promise.resolve({ data: matched, error: null }).then(resolve);
          } catch (e) {
            return reject ? reject(e) : Promise.reject(e);
          }
        },
      };
      return chain;
    },
  };
  return client;
}

