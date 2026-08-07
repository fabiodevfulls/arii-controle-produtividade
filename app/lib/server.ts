export type AppRole = "supervisor" | "attendant";

export type AppUser = {
  email: string;
  name: string;
  role: AppRole;
  employeeCode: string | null;
  registrationComplete: boolean;
};

const DEFAULT_TYPOLOGIES = [
  ["CHAMADAS (VAREJO)", 220],
  ["SOLICITAR LIGAÇÃO NOVA", 760],
  ["RECLAMAÇÃO DANOS ELÉTRICOS", 576],
  ["RECLAMAÇÃO SOBRE OUTROS MOTIVOS", 300],
  ["RECLAMAÇÃO SOBRE ERRO DE LEITURA", 400],
  ["ATUALIZAÇÃO CADASTRAL DOS DADOS DO TITULAR", 300],
  ["RECLAMAÇÃO APRESENTAÇÃO / ENTREGA DE FATURA", 256],
  ["RECLAMAÇÃO DE ALTERAÇÃO CADASTRAL", 251],
  ["RECLAMAÇÃO SOBRE FATURA", 420],
  ["SOLICITAR DESLIGAMENTO", 250],
  ["RECLAMAÇÃO NÍVEL DE TENSÃO", 306],
  ["RECLAMAÇÃO VARIAÇÃO DE CONSUMO", 544],
  ["CADASTRAR TARIFA SOCIAL BAIXA RENDA", 280],
  ["TROCA DE TITULARIDADE", 843],
] as const;

type RuntimeEnv = {
  DB?: D1Database;
  SUPERVISOR_EMAILS?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

async function getRuntimeEnv(): Promise<RuntimeEnv> {
  const cloudflare = await import("cloudflare:workers");
  return cloudflare.env as unknown as RuntimeEnv;
}

export async function getAuthConfig() {
  const env = await getRuntimeEnv();
  const url = env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Autenticação ainda não configurada.");
  return { url, publishableKey };
}

export async function getDatabase(): Promise<D1Database> {
  const database = (await getRuntimeEnv()).DB;
  if (!database) throw new Error("Banco de dados indisponível.");
  return database;
}

export async function getEmailConfig() {
  const env = await getRuntimeEnv();
  const apiKey = env.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  const from = env.EMAIL_FROM ?? process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Envio de e-mail ainda não configurado.");
  return { apiKey, from };
}

export async function ensureSchema() {
  const db = await getDatabase();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      employee_code TEXT,
      role TEXT NOT NULL DEFAULT 'attendant',
      registration_complete INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      password_salt TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS typologies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      seconds INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      kind TEXT NOT NULL,
      protocol TEXT,
      typology_id INTEGER NOT NULL,
      typology_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      duration_seconds INTEGER NOT NULL,
      occurred_at TEXT NOT NULL,
      distribution_state TEXT,
      backoffice_url TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS registration_verifications (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      employee_code TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_sent_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS activities_user_email_idx ON activities (user_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS activities_occurred_at_idx ON activities (occurred_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS activities_kind_idx ON activities (kind)"),
  ]);

  const userColumns = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  const columnNames = new Set((userColumns.results ?? []).map((column) => column.name));
  if (!columnNames.has("employee_code")) {
    await db.prepare("ALTER TABLE users ADD COLUMN employee_code TEXT").run();
  }
  if (!columnNames.has("registration_complete")) {
    await db
      .prepare("ALTER TABLE users ADD COLUMN registration_complete INTEGER NOT NULL DEFAULT 0")
      .run();
  }
  if (!columnNames.has("password_hash")) {
    await db.prepare("ALTER TABLE users ADD COLUMN password_hash TEXT").run();
  }
  if (!columnNames.has("password_salt")) {
    await db.prepare("ALTER TABLE users ADD COLUMN password_salt TEXT").run();
  }
  if (!columnNames.has("active")) {
    await db.prepare("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1").run();
  }

  const activityColumns = await db.prepare("PRAGMA table_info(activities)").all<{ name: string }>();
  const activityColumnNames = new Set((activityColumns.results ?? []).map((column) => column.name));
  if (!activityColumnNames.has("distribution_state")) {
    await db.prepare("ALTER TABLE activities ADD COLUMN distribution_state TEXT").run();
  }

  const count = await db.prepare("SELECT COUNT(*) AS total FROM typologies").first<{ total: number }>();
  if (!count?.total) {
    await db.batch(
      DEFAULT_TYPOLOGIES.map(([name, seconds]) =>
        db.prepare("INSERT OR IGNORE INTO typologies (name, seconds, active) VALUES (?, ?, 1)").bind(name, seconds),
      ),
    );
  }
}

const BUILT_IN_SUPERVISOR_EMAILS = [
  "fabiodasilvaa82@gmail.com",
  "ariely.carvalho@equatorialservicos.com.br",
];

async function configuredSupervisors() {
  const configured = ((await getRuntimeEnv()).SUPERVISOR_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...BUILT_IN_SUPERVISOR_EMAILS, ...configured])];
}

export async function getIdentity(request: Request): Promise<{ email: string; name: string; employeeCode: string | null } | null> {
  const { sessionEmail } = await import("./auth");
  const email = (await sessionEmail(request.headers))?.trim().toLowerCase();
  if (!email) return null;
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const nameEncoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  let name = email;
  if (encodedName && nameEncoding === "percent-encoded-utf-8") {
    try {
      name = decodeURIComponent(encodedName);
    } catch {
      name = email;
    }
  }
  return {
    email,
    name,
    employeeCode: null,
  };
}

export async function ensureCurrentUser(request: Request): Promise<AppUser | null> {
  const identity = await getIdentity(request);
  if (!identity) return null;
  await ensureSchema();
  const db = await getDatabase();
  const existing = await db
    .prepare(`SELECT email, name, role, employee_code AS employeeCode,
      registration_complete AS registrationComplete FROM users WHERE email = ?`)
    .bind(identity.email)
    .first<AppUser>();
  if (existing) {
    const mustBeSupervisor = (await configuredSupervisors()).includes(identity.email);
    if (mustBeSupervisor && existing.role !== "supervisor") {
      await db.prepare("UPDATE users SET role = 'supervisor', registration_complete = 1 WHERE email = ?")
        .bind(identity.email)
        .run();
      return { ...existing, role: "supervisor", registrationComplete: true };
    }
    return {
      ...existing,
      registrationComplete: existing.role === "supervisor" || Boolean(existing.registrationComplete),
    };
  }

  const role: AppRole =
    (await configuredSupervisors()).includes(identity.email) ? "supervisor" : "attendant";
  const createdAt = new Date().toISOString();
  const registrationComplete = role === "supervisor" || Boolean(identity.employeeCode);
  await db
    .prepare(`INSERT INTO users
      (email, name, employee_code, role, registration_complete, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(identity.email, identity.name, identity.employeeCode, role, registrationComplete ? 1 : 0, createdAt)
    .run();
  return { email: identity.email, name: identity.name, role, employeeCode: identity.employeeCode, registrationComplete };
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  return Response.json({ error: message }, { status: 500 });
}
