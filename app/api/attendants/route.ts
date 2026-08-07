import { hashPassword } from "../../lib/auth";
import { apiError, ensureCurrentUser, getDatabase } from "../../lib/server";

export const dynamic = "force-dynamic";
const ADMIN_EMAIL = "fabiodasilvaa82@gmail.com";
const MAX_ATTENDANTS = 25;
const CORPORATE_DOMAIN = "@equatorialservicos.com.br";

async function requireAdmin(request: Request) {
  const user = await ensureCurrentUser(request);
  return user?.email === ADMIN_EMAIL ? user : null;
}

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin(request))) return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    const db = await getDatabase();
    const result = await db.prepare(`SELECT email, name, employee_code AS employeeCode, active, created_at AS createdAt
      FROM users WHERE role = 'attendant' AND email <> ? ORDER BY name`).bind(ADMIN_EMAIL).all();
    return Response.json({ attendants: result.results ?? [], limit: MAX_ATTENDANTS });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin(request))) return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    const payload = (await request.json()) as { name?: string; email?: string; employeeCode?: string; password?: string };
    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const employeeCode = payload.employeeCode?.trim();
    const password = payload.password ?? "";
    if (!name || name.length < 3 || name.length > 120) return Response.json({ error: "Informe o nome completo." }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (!email.endsWith(CORPORATE_DOMAIN)) return Response.json({ error: `Use somente e-mail corporativo ${CORPORATE_DOMAIN}.` }, { status: 400 });
    if (!employeeCode || employeeCode.length < 2 || employeeCode.length > 40) return Response.json({ error: "Informe a matrícula." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return Response.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    if (email === ADMIN_EMAIL) return Response.json({ error: "Esse e-mail pertence ao administrador." }, { status: 400 });

    const db = await getDatabase();
    const count = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'attendant' AND email <> ?").bind(ADMIN_EMAIL).first<{ total: number }>();
    if ((count?.total ?? 0) >= MAX_ATTENDANTS) return Response.json({ error: `Limite de ${MAX_ATTENDANTS} atendentes atingido.` }, { status: 409 });
    const exists = await db.prepare("SELECT 1 AS found FROM users WHERE email = ?").bind(email).first<{ found: number }>();
    if (exists?.found) return Response.json({ error: "Já existe um cadastro com esse e-mail." }, { status: 409 });

    const credentials = await hashPassword(password);
    await db.prepare(`INSERT INTO users
      (email, name, employee_code, role, registration_complete, password_hash, password_salt, active, created_at)
      VALUES (?, ?, ?, 'attendant', 1, ?, ?, 1, ?)`)
      .bind(email, name, employeeCode, credentials.hash, credentials.salt, new Date().toISOString())
      .run();
    return Response.json({ message: "Atendente cadastrado com sucesso." }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
