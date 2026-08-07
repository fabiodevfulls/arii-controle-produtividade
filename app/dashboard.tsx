"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { exportExcelReport, exportPdfReport } from "./report-export";

type Role = "supervisor" | "attendant";
type ActivityKind = "protocol" | "call";
type Tab = "overview" | "calculator" | "records" | "scripts" | "report" | "team";

type Typology = { id: number; name: string; seconds: number };
type Activity = {
  id: number;
  userEmail: string;
  userName: string;
  kind: ActivityKind;
  protocol: string | null;
  typologyId: number;
  typologyName: string;
  quantity: number;
  durationSeconds: number;
  occurredAt: string;
  distributionState: keyof typeof STATE_CONTACTS | null;
  backofficeUrl: string | null;
};
type TeamMember = {
  email: string;
  name: string;
  protocols: number;
  calls: number;
  total: number;
  productiveSeconds: number;
};
type DashboardData = {
  currentUser: {
    email: string;
    name: string;
    role: Role;
    employeeCode: string | null;
    registrationComplete: boolean;
    isAdmin: boolean;
  };
  typologies: Typology[];
  activities: Activity[];
  team: TeamMember[];
  settings: { workdaySeconds: number; goal: number; challenge: number };
};

const EMPTY_DATA: DashboardData = {
  currentUser: {
    email: "",
    name: "",
    role: "attendant",
    employeeCode: null,
    registrationComplete: false,
    isAdmin: false,
  },
  typologies: [],
  activities: [],
  team: [],
  settings: { workdaySeconds: 20400, goal: 0.9, challenge: 1 },
};

const todayInput = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const timeInput = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function kindLabel(kind: ActivityKind) {
  return kind === "protocol" ? "Protocolo" : "Ligação";
}

function activityDate(value: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} • ${time?.slice(0, 5) ?? "--:--"}`;
}

export default function Dashboard({
  authUser,
  accessToken,
}: {
  authUser: { displayName: string; email: string };
  accessToken: string;
}) {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const onSignOut = async () => {
    window.location.assign("/api/auth/logout");
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as DashboardData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o painel.");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const isSupervisor = data.currentUser.role === "supervisor";
  const navItems: { id: Tab; label: string; icon: string }[] = isSupervisor
    ? [
        { id: "overview", label: "Visão geral", icon: "⌂" },
        { id: "records", label: "Protocolos e ligações", icon: "▤" },
        { id: "report", label: "Relatórios da equipe", icon: "▥" },
        { id: "team", label: "Equipe", icon: "◎" },
      ]
    : [
        { id: "overview", label: "Visão geral", icon: "⌂" },
        { id: "calculator", label: "Calculadora", icon: "▦" },
        { id: "records", label: "Meus registros", icon: "▤" },
        { id: "scripts", label: "Scripts", icon: "✎" },
        { id: "report", label: "Meu relatório", icon: "▥" },
      ];

  const today = todayInput();
  const todayActivities = useMemo(
    () => data.activities.filter((activity) => activity.occurredAt.startsWith(today)),
    [data.activities, today],
  );
  const todayProtocols = todayActivities
    .filter((activity) => activity.kind === "protocol")
    .reduce((sum, activity) => sum + activity.quantity, 0);
  const todayCalls = todayActivities
    .filter((activity) => activity.kind === "call")
    .reduce((sum, activity) => sum + activity.quantity, 0);
  const todayProductiveSeconds = todayActivities.reduce(
    (sum, activity) => sum + activity.durationSeconds * activity.quantity,
    0,
  );
  const productivity = todayProductiveSeconds / data.settings.workdaySeconds;

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setMenuOpen(false);
    setSearch("");
  }

  if (!loading && !error && !isSupervisor && !data.currentUser.registrationComplete) {
    return (
      <AccountRegistration
        email={data.currentUser.email || authUser.email}
        suggestedName={data.currentUser.name || authUser.displayName}
        accessToken={accessToken}
        onSignOut={onSignOut}
        onCompleted={loadDashboard}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">A</span>
          <div><strong>ARII</strong><small>Produtividade</small></div>
        </div>
        <nav aria-label="Navegação principal">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "nav-item active" : "nav-item"}
              onClick={() => selectTab(item.id)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className={`role-chip ${isSupervisor ? "supervisor" : "attendant"}`}>
            {isSupervisor ? "Supervisão • leitura" : "Atendente"}
          </span>
          <small>{data.currentUser.email || authUser.email}</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">☰</button>
          <div>
            <h1>Controle de Produtividade <span>•</span> Backoffice</h1>
            <p>{isSupervisor ? "Acompanhamento da equipe" : "Meus protocolos e ligações"}</p>
          </div>
          <div className="topbar-user">
            <span className="today-label">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
            <div className="avatar" aria-hidden="true">{(data.currentUser.name || authUser.displayName).charAt(0).toUpperCase()}</div>
            <button type="button" className="signout signout-button" onClick={() => void onSignOut()}>Sair</button>
          </div>
        </header>

        <div className="content">
          {error ? <div className="alert error">{error}<button onClick={() => void loadDashboard()}>Tentar novamente</button></div> : null}
          {loading ? <LoadingState /> : null}
          {!loading && !error ? (
            <>
              {tab === "overview" && (
                <Overview
                  isSupervisor={isSupervisor}
                  data={data}
                  productivity={productivity}
                  todayProtocols={todayProtocols}
                  todayCalls={todayCalls}
                  todayProductiveSeconds={todayProductiveSeconds}
                  onSaved={loadDashboard}
                  accessToken={accessToken}
                />
              )}
              {tab === "calculator" && !isSupervisor && <Calculator data={data} />}
              {tab === "scripts" && !isSupervisor && <Scripts />}
              {tab === "records" && (
                <Records
                  activities={data.activities}
                  typologies={data.typologies}
                  search={search}
                  setSearch={setSearch}
                  isSupervisor={isSupervisor}
                  accessToken={accessToken}
                  onChanged={loadDashboard}
                />
              )}
              {tab === "report" && (
                <Report data={data} isSupervisor={isSupervisor} />
              )}
              {tab === "team" && isSupervisor && <Team data={data} />}
            </>
          ) : null}
        </div>
      </section>
      {menuOpen ? <button className="menu-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} /> : null}
    </main>
  );
}

function AccountRegistration({
  email,
  suggestedName,
  accessToken,
  onSignOut,
  onCompleted,
}: {
  email: string;
  suggestedName: string;
  accessToken: string;
  onSignOut: () => Promise<void>;
  onCompleted: () => Promise<void>;
}) {
  const [name, setName] = useState(suggestedName);
  const [employeeCode, setEmployeeCode] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "saving" | "error"; message: string }>({
    type: "idle",
    message: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "saving", message: "Criando seu cadastro..." });
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, employeeCode }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir o cadastro.");
      await onCompleted();
    } catch (submitError) {
      setStatus({
        type: "error",
        message: submitError instanceof Error ? submitError.message : "Não foi possível concluir o cadastro.",
      });
    }
  }

  return (
    <main className="registration-shell">
      <section className="registration-card" aria-labelledby="registration-title">
        <div className="registration-heading">
          <span className="brand-mark">A</span>
          <div><p className="eyebrow">PRIMEIRO ACESSO</p><h1 id="registration-title">Crie seu cadastro de atendente</h1></div>
        </div>
        <p className="registration-copy">
          Preencha seus dados uma única vez. Depois você terá acesso à calculadora,
          aos seus registros e ao seu relatório individual.
        </p>
        <form className="activity-form" onSubmit={submit}>
          <label className="field"><span>Nome completo</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={120} required /></label>
          <label className="field"><span>E-mail de acesso</span><input value={email} readOnly aria-readonly="true" /></label>
          <label className="field"><span>Matrícula ou identificação</span><input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} minLength={2} maxLength={40} placeholder="Ex.: 123456" required /></label>
          <button className="primary-button" type="submit" disabled={status.type === "saving"}>{status.type === "saving" ? "Criando cadastro..." : "Concluir meu cadastro"}</button>
          {status.message ? <p className={`form-status ${status.type}`}>{status.message}</p> : null}
        </form>
        <button className="registration-exit registration-exit-button" type="button" onClick={() => void onSignOut()}>Sair e usar outra conta</button>
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="loading-grid" aria-label="Carregando painel">
      {[1, 2, 3, 4].map((item) => <div className="skeleton" key={item} />)}
    </div>
  );
}

function Overview({
  isSupervisor,
  data,
  productivity,
  todayProtocols,
  todayCalls,
  todayProductiveSeconds,
  onSaved,
  accessToken,
}: {
  isSupervisor: boolean;
  data: DashboardData;
  productivity: number;
  todayProtocols: number;
  todayCalls: number;
  todayProductiveSeconds: number;
  onSaved: () => Promise<void>;
  accessToken: string;
}) {
  const teamProductivity = data.team.length
    ? data.team.reduce((sum, member) => sum + member.productiveSeconds, 0) /
      (data.settings.workdaySeconds * data.team.length)
    : 0;
  const cards = isSupervisor
    ? [
        { label: "Atendentes", value: String(data.team.length), icon: "◎", tone: "blue" },
        { label: "Protocolos registrados", value: String(data.activities.filter((a) => a.kind === "protocol").reduce((s, a) => s + a.quantity, 0)), icon: "▤", tone: "blue" },
        { label: "Ligações registradas", value: String(data.activities.filter((a) => a.kind === "call").reduce((s, a) => s + a.quantity, 0)), icon: "◖", tone: "green" },
        { label: "Produtividade da equipe", value: formatPercent(teamProductivity), icon: "↗", tone: "green" },
      ]
    : [
        { label: "Produtividade hoje", value: formatPercent(productivity), icon: "↗", tone: "green" },
        { label: "Protocolos hoje", value: String(todayProtocols), icon: "▤", tone: "blue" },
        { label: "Ligações hoje", value: String(todayCalls), icon: "◖", tone: "blue" },
        { label: "Tempo produtivo", value: formatDuration(todayProductiveSeconds), icon: "◷", tone: "green" },
      ];

  return (
    <div className="page-stack">
      <section className="metric-grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.label}>
            <span className={`metric-icon ${card.tone}`}>{card.icon}</span>
            <div><small>{card.label}</small><strong>{card.value}</strong></div>
          </article>
        ))}
      </section>

      {isSupervisor ? (
        <div className="dashboard-grid supervisor-grid">
          <TeamSummary data={data} compact />
          <RecentActivities activities={data.activities} supervisor />
        </div>
      ) : (
        <div className="dashboard-grid">
          <ActivityForm typologies={data.typologies} onSaved={onSaved} accessToken={accessToken} />
          <RecentActivities activities={data.activities} />
        </div>
      )}
    </div>
  );
}

function ActivityForm({ typologies, onSaved, accessToken }: { typologies: Typology[]; onSaved: () => Promise<void>; accessToken: string }) {
  const [kind, setKind] = useState<ActivityKind>("protocol");
  const [protocol, setProtocol] = useState("");
  const [typologyId, setTypologyId] = useState(typologies[0]?.id ?? 0);
  const [date, setDate] = useState(todayInput());
  const [time, setTime] = useState(timeInput());
  const [quantity, setQuantity] = useState(1);
  const [distributionState, setDistributionState] = useState<keyof typeof STATE_CONTACTS>("PA");
  const [status, setStatus] = useState<{ type: "idle" | "saving" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const selectedTypologyId = typologyId || typologies[0]?.id || 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "saving", message: "Salvando registro..." });
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ kind, protocol, typologyId: selectedTypologyId, date, time, quantity, distributionState }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setStatus({ type: "success", message: result.message || "Registro salvo." });
      setProtocol("");
      setQuantity(1);
      await onSaved();
    } catch (submitError) {
      setStatus({ type: "error", message: submitError instanceof Error ? submitError.message : "Não foi possível salvar." });
    }
  }

  return (
    <section className="panel register-panel">
      <div className="section-heading"><div><p className="eyebrow">NOVO REGISTRO</p><h2>Registrar atividade</h2></div><span className="permission-tag">Seu acesso</span></div>
      <div className="kind-toggle" role="group" aria-label="Tipo de atividade">
        <button type="button" className={kind === "protocol" ? "selected" : ""} onClick={() => setKind("protocol")}>Protocolo</button>
        <button type="button" className={kind === "call" ? "selected" : ""} onClick={() => setKind("call")}>Ligação</button>
      </div>
      <form onSubmit={submit} className="activity-form">
        <label className="field"><span>Tipologia</span><select value={selectedTypologyId} onChange={(event) => setTypologyId(Number(event.target.value))} required>{typologies.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        {kind === "protocol" ? <label className="field"><span>Número do protocolo</span><input value={protocol} onChange={(event) => setProtocol(event.target.value)} placeholder="Ex.: PC-5821" required /></label> : null}
        <label className="field"><span>Estado atendido</span><select value={distributionState} onChange={(event) => setDistributionState(event.target.value as keyof typeof STATE_CONTACTS)} required>{Object.entries(STATE_CONTACTS).map(([code, item]) => <option key={code} value={code}>{item.state}</option>)}</select></label>
        <div className="form-row three">
          <label className="field"><span>Data</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label className="field"><span>Hora</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
          <label className="field"><span>Quantidade</span><input type="number" min="1" max="9999" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required /></label>
        </div>
        <button className="primary-button" type="submit" disabled={status.type === "saving"}>{status.type === "saving" ? "Salvando..." : "Salvar meu registro"}</button>
        {status.message ? <p className={`form-status ${status.type}`}>{status.message}</p> : null}
      </form>
    </section>
  );
}

function RecentActivities({ activities, supervisor = false }: { activities: Activity[]; supervisor?: boolean }) {
  const recent = activities.slice(0, 8);
  return (
    <section className="panel recent-panel">
      <div className="section-heading"><div><p className="eyebrow">ATUALIZAÇÃO AUTOMÁTICA</p><h2>{supervisor ? "Últimos registros da equipe" : "Meus últimos registros"}</h2></div><span className="live-dot">Ao vivo</span></div>
      {recent.length ? <div className="activity-list">{recent.map((activity) => (
        <article className="activity-item" key={activity.id}>
          <span className={`kind-badge ${activity.kind}`}>{activity.kind === "protocol" ? "P" : "L"}</span>
          <div className="activity-main"><strong>{activity.protocol || kindLabel(activity.kind)}</strong><span>{activity.typologyName}{activity.distributionState ? ` • ${activity.distributionState}` : ""}</span>{supervisor ? <small>{activity.userName}</small> : null}</div>
          <div className="activity-meta"><strong>{activity.quantity}</strong><span>{activityDate(activity.occurredAt)}</span></div>
        </article>
      ))}</div> : <EmptyState title="Nenhum registro ainda" text={supervisor ? "Os registros dos atendentes aparecerão aqui." : "Cadastre seu primeiro protocolo ou ligação."} />}
    </section>
  );
}

function Calculator({ data }: { data: DashboardData }) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const productiveSeconds = data.typologies.reduce((sum, item) => sum + item.seconds * (quantities[item.id] || 0), 0);
  const percentage = productiveSeconds / data.settings.workdaySeconds;
  return (
    <div className="page-stack">
      <div className="page-title"><div><p className="eyebrow">SIMULAÇÃO INDIVIDUAL</p><h2>Calculadora de produtividade</h2><p>Informe quanto realizou de cada tipologia. A simulação não cria registros.</p></div></div>
      <section className="calculator-layout">
        <div className="panel calculator-table">
          <div className="table-header"><span>Tipologia</span><span>Tempo padrão</span><span>Quantidade</span></div>
          {data.typologies.map((item) => (
            <div className="calculator-row" key={item.id}>
              <span>{item.name}</span><span>{formatDuration(item.seconds)}</span>
              <input aria-label={`Quantidade de ${item.name}`} type="number" min="0" value={quantities[item.id] || ""} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Number(event.target.value) || 0) }))} />
            </div>
          ))}
        </div>
        <aside className="panel calculator-result">
          <p className="eyebrow">RESULTADO</p><div className="score-ring" style={{ "--score": `${Math.min(100, percentage * 100)}%` } as React.CSSProperties}><strong>{formatPercent(percentage)}</strong><span>produtividade</span></div>
          <div className="result-line"><span>Tempo produtivo</span><strong>{formatDuration(productiveSeconds)}</strong></div>
          <div className="result-line"><span>Meta</span><strong>90%</strong></div>
          <div className={`result-status ${percentage >= 1 ? "challenge" : percentage >= 0.9 ? "goal" : "below"}`}>{percentage >= 1 ? "Desafio alcançado" : percentage >= 0.9 ? "Meta alcançada" : "Abaixo da meta"}</div>
        </aside>
      </section>
    </div>
  );
}

function Records({ activities, typologies, search, setSearch, isSupervisor, accessToken, onChanged }: { activities: Activity[]; typologies: Typology[]; search: string; setSearch: (value: string) => void; isSupervisor: boolean; accessToken: string; onChanged: () => Promise<void> }) {
  const [kind, setKind] = useState<"all" | ActivityKind>("all");
  const [editing, setEditing] = useState<Activity | null>(null);
  const [actionStatus, setActionStatus] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const filtered = activities.filter((activity) => {
    const matchesKind = kind === "all" || activity.kind === kind;
    const haystack = `${activity.protocol ?? ""} ${activity.typologyName} ${activity.userName} ${activity.distributionState ?? ""}`.toLowerCase();
    return matchesKind && haystack.includes(search.toLowerCase());
  });

  async function deleteActivity(activity: Activity) {
    const label = activity.protocol ? `o protocolo ${activity.protocol}` : "esta ligação";
    if (!window.confirm(`Tem certeza que deseja excluir ${label}? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(activity.id);
    setActionStatus("");
    try {
      const response = await fetch(`/api/activities?id=${activity.id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir o registro.");
      setActionStatus(result.message || "Registro excluído.");
      await onChanged();
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "Não foi possível excluir o registro.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-title"><div><p className="eyebrow">HISTÓRICO</p><h2>{isSupervisor ? "Protocolos e ligações da equipe" : "Meus registros"}</h2><p>{isSupervisor ? "Consulta somente de leitura, organizada por atendente." : "Confira tudo o que você cadastrou."}</p></div></div>
      <section className="panel records-panel">
        <div className="filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar protocolo, tipologia ou atendente" /><select value={kind} onChange={(event) => setKind(event.target.value as "all" | ActivityKind)}><option value="all">Todos os tipos</option><option value="protocol">Protocolos</option><option value="call">Ligações</option></select></div>
        {actionStatus ? <p className="records-status" role="status">{actionStatus}</p> : null}
        <ActivityTable activities={filtered} showUser={isSupervisor} onEdit={isSupervisor ? undefined : setEditing} onDelete={isSupervisor ? undefined : deleteActivity} deletingId={deletingId} />
      </section>
      {editing ? <EditActivityModal activity={editing} typologies={typologies} accessToken={accessToken} onClose={() => setEditing(null)} onSaved={async (message) => { setEditing(null); setActionStatus(message); await onChanged(); }} /> : null}
    </div>
  );
}

function ActivityTable({ activities, showUser, onEdit, onDelete, deletingId }: { activities: Activity[]; showUser: boolean; onEdit?: (activity: Activity) => void; onDelete?: (activity: Activity) => void; deletingId?: number | null }) {
  if (!activities.length) return <EmptyState title="Nada encontrado" text="Ajuste os filtros ou aguarde novos registros." />;
  return (
    <div className="table-scroll"><table><thead><tr>{showUser ? <th>Atendente</th> : null}<th>Tipo</th><th>Estado</th><th>Protocolo</th><th>Tipologia</th><th>Quantidade</th><th>Data e hora</th>{onEdit && onDelete ? <th>Ações</th> : null}</tr></thead><tbody>{activities.map((activity) => <tr key={activity.id}>{showUser ? <td><strong>{activity.userName}</strong><small>{activity.userEmail}</small></td> : null}<td><span className={`table-kind ${activity.kind}`}>{kindLabel(activity.kind)}</span></td><td><strong>{activity.distributionState || "—"}</strong></td><td>{activity.protocol || "—"}</td><td>{activity.typologyName}</td><td>{activity.quantity}</td><td>{activityDate(activity.occurredAt)}</td>{onEdit && onDelete ? <td><div className="record-actions"><button type="button" className="edit-action" onClick={() => onEdit(activity)}>Editar</button><button type="button" className="delete-action" onClick={() => onDelete(activity)} disabled={deletingId === activity.id}>{deletingId === activity.id ? "Excluindo..." : "Excluir"}</button></div></td> : null}</tr>)}</tbody></table></div>
  );
}

function EditActivityModal({ activity, typologies, accessToken, onClose, onSaved }: { activity: Activity; typologies: Typology[]; accessToken: string; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [kind, setKind] = useState<ActivityKind>(activity.kind);
  const [protocol, setProtocol] = useState(activity.protocol || "");
  const [typologyId, setTypologyId] = useState(activity.typologyId);
  const [quantity, setQuantity] = useState(activity.quantity);
  const [date, setDate] = useState(activity.occurredAt.slice(0, 10));
  const [time, setTime] = useState(activity.occurredAt.slice(11, 16));
  const [distributionState, setDistributionState] = useState<keyof typeof STATE_CONTACTS>(activity.distributionState || "PA");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/activities", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: activity.id, kind, protocol, typologyId, quantity, date, time, distributionState }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o registro.");
      await onSaved(result.message || "Registro atualizado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível atualizar o registro.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="panel edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-record-title">
        <div className="section-heading"><div><p className="eyebrow">CORRIGIR REGISTRO</p><h2 id="edit-record-title">Editar protocolo ou ligação</h2></div><button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button></div>
        <div className="kind-toggle" role="group" aria-label="Tipo de atividade"><button type="button" className={kind === "protocol" ? "selected" : ""} onClick={() => setKind("protocol")}>Protocolo</button><button type="button" className={kind === "call" ? "selected" : ""} onClick={() => setKind("call")}>Ligação</button></div>
        <form className="activity-form" onSubmit={submit}>
          <label className="field"><span>Tipologia</span><select value={typologyId} onChange={(event) => setTypologyId(Number(event.target.value))} required>{typologies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {kind === "protocol" ? <label className="field"><span>Número do protocolo</span><input value={protocol} onChange={(event) => setProtocol(event.target.value)} required autoFocus /></label> : null}
          <label className="field"><span>Estado atendido</span><select value={distributionState} onChange={(event) => setDistributionState(event.target.value as keyof typeof STATE_CONTACTS)} required>{Object.entries(STATE_CONTACTS).map(([code, item]) => <option key={code} value={code}>{item.state}</option>)}</select></label>
          <div className="form-row three"><label className="field"><span>Data</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label className="field"><span>Hora</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label><label className="field"><span>Quantidade</span><input type="number" min="1" max="9999" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required /></label></div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></div>
          {status ? <p className="form-status error" role="alert">{status}</p> : null}
        </form>
      </section>
    </div>
  );
}

type AttendantAccount = { email: string; name: string; employeeCode: string; active: number; createdAt: string };

function Attendants() {
  const [attendants, setAttendants] = useState<AttendantAccount[]>([]);
  const [limit, setLimit] = useState(25);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message: string }>({ type: "loading", message: "Carregando atendentes..." });

  const loadAttendants = useCallback(async () => {
    const response = await fetch("/api/attendants", { cache: "no-store" });
    const result = await response.json() as { attendants?: AttendantAccount[]; limit?: number; error?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar os atendentes.");
    setAttendants(result.attendants ?? []);
    setLimit(result.limit ?? 25);
    setStatus({ type: "idle", message: "" });
  }, []);

  useEffect(() => {
    void loadAttendants().catch((error) => setStatus({ type: "error", message: error instanceof Error ? error.message : "Erro ao carregar." }));
  }, [loadAttendants]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Criando acesso..." });
    try {
      const response = await fetch("/api/attendants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, employeeCode, password }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível cadastrar.");
      setName(""); setEmail(""); setEmployeeCode(""); setPassword("");
      await loadAttendants();
      setStatus({ type: "success", message: result.message || "Atendente cadastrado." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Não foi possível cadastrar." });
    }
  }

  return (
    <div className="page-stack attendants-page">
      <div className="page-title"><div><p className="eyebrow">ADMINISTRAÇÃO DE ACESSOS</p><h2>Cadastro de atendentes</h2><p>Crie até {limit} acessos individuais. Somente e-mails Microsoft corporativos da Equatorial Serviços.</p></div><span className="permission-tag">{attendants.length}/{limit} cadastrados</span></div>
      <section className="attendants-layout">
        <form className="panel attendants-form activity-form" onSubmit={submit}>
          <div className="section-heading"><div><p className="eyebrow">NOVO ACESSO</p><h2>Adicionar atendente</h2></div></div>
          <label className="field"><span>Nome completo</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={120} required /></label>
          <label className="field"><span>E-mail corporativo Microsoft</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value.toLowerCase())} placeholder="nome@equatorialservicos.com.br" pattern=".+@equatorialservicos\.com\.br" required /></label>
          <label className="field"><span>Matrícula</span><input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} minLength={2} maxLength={40} required /></label>
          <label className="field"><span>Senha inicial</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required /><em>Use no mínimo 8 caracteres. Entregue a senha diretamente ao atendente.</em></label>
          <button className="primary-button" type="submit" disabled={status.type === "loading" || attendants.length >= limit}>{attendants.length >= limit ? "Limite atingido" : status.type === "loading" ? "Salvando..." : "Cadastrar atendente"}</button>
          {status.message ? <p className={`form-status ${status.type}`}>{status.message}</p> : null}
        </form>
        <section className="panel attendants-list-panel">
          <div className="section-heading"><div><p className="eyebrow">EQUIPE CADASTRADA</p><h2>Atendentes</h2></div></div>
          {attendants.length ? <div className="attendant-list">{attendants.map((attendant) => <article key={attendant.email} className="attendant-card"><span className="avatar">{attendant.name.charAt(0).toUpperCase()}</span><div><strong>{attendant.name}</strong><span>{attendant.email}</span><small>Matrícula: {attendant.employeeCode}</small></div><span className="active-badge">Ativo</span></article>)}</div> : <EmptyState title="Nenhum atendente cadastrado" text="Use o formulário para criar o primeiro acesso corporativo." />}
        </section>
      </section>
    </div>
  );
}

type ScriptKind = "immediate" | "analysis" | "denied" | "reactivation" | "repeat";

const STATE_CONTACTS = {
  AL: { state: "Alagoas", whatsapp: "(82) 2126-9200", central: "0800 082 0196" },
  AP: { state: "Amapá", whatsapp: "(96) 3082-2949", central: "0800 096 0196" },
  GO: { state: "Goiás", whatsapp: "(62) 3243-2020", central: "0800 062 0196" },
  MA: { state: "Maranhão", whatsapp: "(98) 2055-0116", central: "116" },
  PA: { state: "Pará", whatsapp: "(91) 3217-8200", central: "0800 091 0196" },
  PI: { state: "Piauí", whatsapp: "(86) 3228-8200", central: "0800 086 0800" },
  RS: { state: "Rio Grande do Sul", whatsapp: "(51) 3382-5500", central: "0800 721 2333" },
} as const;

function Scripts() {
  const [stateCode, setStateCode] = useState<keyof typeof STATE_CONTACTS>("PA");
  const [kind, setKind] = useState<ScriptKind>("immediate");
  const [customerName, setCustomerName] = useState("");
  const [sapProtocol, setSapProtocol] = useState("");
  const [newContract, setNewContract] = useState("");
  const [siteProtocol, setSiteProtocol] = useState("");
  const [previousProtocol, setPreviousProtocol] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [copied, setCopied] = useState(false);
  const contact = STATE_CONTACTS[stateCode];
  const name = customerName.trim().toUpperCase() || "NOME COMPLETO DO CLIENTE";
  const protocol = sapProtocol.trim() || "NÚMERO DO PROTOCOLO SAP";
  const footer = `Estamos à disposição para lhe atender: www.equatorialenergia.com.br, WhatsApp ${contact.whatsapp} e Central de Atendimento ${contact.central}.\n\nConte sempre com a nossa Energia!\n\nEquatorial Energia`;

  const scripts: Record<ScriptKind, string> = {
    immediate: `Olá, ${name}!\n\nRecebemos a sua solicitação de Troca de Titularidade e já registramos em nosso sistema. Sua nova conta contrato ${newContract.trim() || "NOVA CONTA CONTRATO"} marca o início da sua jornada como cliente da Equatorial. O número do seu protocolo de atendimento é ${protocol}.\n\n${footer}`,
    analysis: `Olá, ${name}!\n\nRecebemos a sua solicitação de Troca de Titularidade e já encaminhamos para análise. Se estiver tudo certo, o serviço será realizado em até 3 (três) dias úteis para área urbana ou 5 (cinco) dias úteis para área rural. Orientamos acompanhar o andamento pela Central de Atendimento, site ou agência mais próxima. O número do seu protocolo de atendimento é ${protocol}.\n\n${footer}`,
    denied: `Olá, ${name}!\n\nRecebemos a sua solicitação de Troca de Titularidade, porém ainda não foi possível realizar o atendimento pelo seguinte motivo: ${denialReason.trim().toUpperCase() || "INFORME O MOTIVO DO INDEFERIMENTO"}. Solicite um novo serviço assim que o motivo indicado estiver resolvido. Aguardamos seu retorno!\n\nO número do seu protocolo de atendimento é ${protocol}.\n\n${footer}`,
    reactivation: `Olá, ${name}!\n\nRecebemos a sua solicitação de Troca de Titularidade e já encaminhamos para análise. Se estiver tudo certo, o serviço será realizado em até 3 (três) dias úteis para área urbana ou 5 (cinco) dias úteis para área rural, e a reativação será realizada em até 5 dias úteis. Orientamos acompanhar o andamento pela Central de Atendimento, site ou agência mais próxima. O número do seu protocolo de atendimento é ${protocol}.\n\n${footer}`,
    repeat: `Olá, ${name}!\n\nA sua solicitação de Troca de Titularidade, registrada pelo protocolo do site ${siteProtocol.trim() || "PROTOCOLO DO SITE"}, não foi registrada porque identificamos que já consta uma solicitação pelo protocolo ${previousProtocol.trim() || "PROTOCOLO ANTERIOR"}, que se encontra em andamento. Esta solicitação será classificada como reincidente e será necessário aguardar sua conclusão e comunicação.\n\nO número do seu protocolo de atendimento é ${protocol}.\n\n${footer}`,
  };
  const result = scripts[kind];

  async function copyScript() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="page-stack scripts-page">
      <div className="page-title"><div><p className="eyebrow">TEXTOS PADRONIZADOS</p><h2>Scripts de Troca de Titularidade</h2><p>Selecione o estado e o parecer. Os telefones corretos entram automaticamente.</p></div></div>
      <section className="scripts-layout">
        <div className="panel scripts-form-panel">
          <div className="form-row script-two-columns">
            <label className="field"><span>Estado do atendimento</span><select value={stateCode} onChange={(event) => setStateCode(event.target.value as keyof typeof STATE_CONTACTS)}>{Object.entries(STATE_CONTACTS).map(([code, item]) => <option key={code} value={code}>{item.state}</option>)}</select></label>
            <label className="field"><span>Tipo de parecer</span><select value={kind} onChange={(event) => setKind(event.target.value as ScriptKind)}><option value="immediate">Deferido — troca imediata</option><option value="analysis">Deferido — encaminhado para análise</option><option value="denied">Indeferido</option><option value="reactivation">Análise com reativação</option><option value="repeat">Reincidente</option></select></label>
          </div>
          <label className="field"><span>Nome completo do cliente</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Ex.: Antônio dos Santos Sousa" /></label>
          <label className="field"><span>Protocolo do SAP</span><input value={sapProtocol} onChange={(event) => setSapProtocol(event.target.value)} placeholder="Ex.: 65986619" /></label>
          {kind === "immediate" ? <label className="field"><span>Nova conta contrato</span><input value={newContract} onChange={(event) => setNewContract(event.target.value)} placeholder="Ex.: 3040387519" /></label> : null}
          {kind === "denied" ? <label className="field"><span>Motivo do indeferimento</span><textarea value={denialReason} onChange={(event) => setDenialReason(event.target.value)} placeholder="Ex.: Documentação incompleta..." rows={4} /></label> : null}
          {kind === "repeat" ? <div className="form-row script-two-columns"><label className="field"><span>Protocolo do site</span><input value={siteProtocol} onChange={(event) => setSiteProtocol(event.target.value)} /></label><label className="field"><span>Protocolo anterior em andamento</span><input value={previousProtocol} onChange={(event) => setPreviousProtocol(event.target.value)} /></label></div> : null}
          <div className="state-contact-card"><strong>Contatos de {contact.state}</strong><span>WhatsApp {contact.whatsapp}</span><span>Central {contact.central}</span></div>
        </div>
        <aside className="panel script-preview-panel">
          <div className="section-heading"><div><p className="eyebrow">PRONTO PARA USAR</p><h2>Prévia do script</h2></div></div>
          <pre>{result}</pre>
          <button className="primary-button copy-script-button" type="button" onClick={() => void copyScript()}>{copied ? "Script copiado!" : "Copiar script"}</button>
        </aside>
      </section>
    </div>
  );
}

function Report({ data, isSupervisor }: { data: DashboardData; isSupervisor: boolean }) {
  const [selectedEmail, setSelectedEmail] = useState("all");
  const source = isSupervisor && selectedEmail !== "all" ? data.activities.filter((activity) => activity.userEmail === selectedEmail) : data.activities;
  const groups = data.typologies.map((typology) => {
    const items = source.filter((activity) => activity.typologyId === typology.id);
    return { name: typology.name, total: items.reduce((sum, item) => sum + item.quantity, 0) };
  }).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...groups.map((item) => item.total));
  const protocolCount = source.filter((item) => item.kind === "protocol").reduce((sum, item) => sum + item.quantity, 0);
  const callCount = source.filter((item) => item.kind === "call").reduce((sum, item) => sum + item.quantity, 0);
  const selectedMember = data.team.find((member) => member.email === selectedEmail);
  const exportOptions = {
    title: isSupervisor ? "Relatório de produtividade da equipe" : "Relatório individual de produtividade",
    subtitle: isSupervisor ? (selectedMember?.name ?? "Toda a equipe") : data.currentUser.name,
    activities: source,
  };
  return (
    <div className="page-stack">
      <div className="page-title report-title"><div><p className="eyebrow">ANÁLISE</p><h2>{isSupervisor ? "Relatórios da equipe" : "Meu relatório"}</h2><p>{isSupervisor ? "Selecione toda a equipe ou um atendente para consultar e exportar." : "Resumo individual dos seus registros realizados no sistema."}</p></div>{isSupervisor ? <div className="report-toolbar"><select value={selectedEmail} onChange={(event) => setSelectedEmail(event.target.value)}><option value="all">Toda a equipe</option>{data.team.map((member) => <option key={member.email} value={member.email}>{member.name}</option>)}</select><div className="export-actions"><button type="button" className="export-button pdf" onClick={() => exportPdfReport(exportOptions)}>Baixar PDF</button><button type="button" className="export-button excel" onClick={() => exportExcelReport(exportOptions)}>Baixar Excel</button></div></div> : <span className="permission-tag readonly">Visualização individual</span>}</div>
      <section className="metric-grid report-metrics"><article className="metric-card"><span className="metric-icon blue">▤</span><div><small>Protocolos</small><strong>{protocolCount}</strong></div></article><article className="metric-card"><span className="metric-icon green">◖</span><div><small>Ligações</small><strong>{callCount}</strong></div></article><article className="metric-card"><span className="metric-icon blue">Σ</span><div><small>Total</small><strong>{protocolCount + callCount}</strong></div></article></section>
      <section className="panel chart-panel"><div className="section-heading"><div><p className="eyebrow">DISTRIBUIÇÃO</p><h2>Quantidade por tipologia</h2></div></div>{groups.length ? <div className="bar-chart">{groups.map((item) => <div className="bar-row" key={item.name}><div><span>{item.name}</span><strong>{item.total}</strong></div><div className="bar-track"><span style={{ width: `${(item.total / max) * 100}%` }} /></div></div>)}</div> : <EmptyState title="Sem dados para o relatório" text="Os indicadores serão exibidos após os primeiros registros." />}</section>
    </div>
  );
}

function Team({ data }: { data: DashboardData }) {
  return <div className="page-stack"><div className="page-title"><div><p className="eyebrow">ACESSO DA SUPERVISÃO</p><h2>Desempenho da equipe</h2><p>Somente visualização: nenhum registro pode ser criado ou alterado aqui.</p></div></div><TeamSummary data={data} /></div>;
}

function TeamSummary({ data, compact = false }: { data: DashboardData; compact?: boolean }) {
  return (
    <section className={`panel team-panel ${compact ? "compact" : ""}`}>
      <div className="section-heading"><div><p className="eyebrow">EQUIPE</p><h2>Resultado por atendente</h2></div><span className="permission-tag readonly">Somente leitura</span></div>
      {data.team.length ? <div className="table-scroll"><table><thead><tr><th>Atendente</th><th>Protocolos</th><th>Ligações</th><th>Total</th><th>Produtividade</th></tr></thead><tbody>{data.team.map((member) => { const score = member.productiveSeconds / data.settings.workdaySeconds; return <tr key={member.email}><td><strong>{member.name}</strong><small>{member.email}</small></td><td>{member.protocols}</td><td>{member.calls}</td><td>{member.total}</td><td><span className={`score-pill ${score >= 0.9 ? "good" : "low"}`}>{formatPercent(score)}</span></td></tr>; })}</tbody></table></div> : <EmptyState title="Nenhum atendente identificado" text="Os atendentes aparecerão depois do primeiro acesso ao sistema." />}
    </section>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><span>○</span><strong>{title}</strong><p>{text}</p></div>;
}
