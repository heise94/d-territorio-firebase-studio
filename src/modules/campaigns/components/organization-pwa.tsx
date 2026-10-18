"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Share2,
  UsersRound,
} from "lucide-react";
import { campaignFetch } from "../lib/campaign-fetch";
import {
  normalizeChileanPhone,
  organizerPhoneDigits,
} from "../schemas/participant-auth";
import { joinShareUrl } from "../lib/public-join";
import { AvailabilitySummary } from "./availability-summary";
type Block = {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  available?: boolean;
  published?: boolean;
  minimum?: number;
  missing?: number;
  state?: string;
  count?: number;
  companions?: string[];
};
type Day = {
  id: string;
  date: string;
  label: string;
  blocks: Block[];
  count?: number;
};
type Overview = {
  campaign: { name: string; roleLabel: string; status: string };
  participantCount: number;
  days: Day[];
  coverageSummary: { total: number; missing: number };
};
type Row = {
  registrationId: string;
  fullName: string;
  congregation: string;
  congregationId: string | null;
};
type Detail = {
  registrationId: string;
  fullName: string;
  phone: string;
  congregation: string;
  maxTurns: number | null;
  partner: { fullName: string; congregation: string } | null;
  days: Day[];
};
type Cong = { id: string; name: string; count?: number };
const field =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base";
const date = (v: string) =>
  new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${v}T12:00:00`));
const max = (v: number | null) =>
  v ? `${v} ${v === 1 ? "turno" : "turnos"}` : "Sin límite";
export function OrganizationPwa({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<
      "Inicio" | "Participantes" | "Agregar" | "Cobertura"
    >("Inicio"),
    [overview, setOverview] = useState<Overview | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState("");
  const load = () =>
    campaignFetch(`/api/campanas/organization/campaigns/${campaignId}`)
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        setOverview(b);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    void load();
  }, [campaignId]);
  if (error)
    return (
      <main className="campaign-page p-8">
        <p role="alert">{error}</p>
      </main>
    );
  if (!overview)
    return <main className="campaign-page p-8">Cargando Organización…</main>;
  const open = (id: string) => {
    setSelected(id);
    setTab("Participantes");
  };
  const content =
    tab === "Inicio" ? (
      <Home id={campaignId} o={overview} go={setTab} />
    ) : tab === "Participantes" ? (
      <PeopleV2
        id={campaignId}
        initial={selected}
        clear={() => setSelected(null)}
      />
    ) : tab === "Agregar" ? (
      <Add id={campaignId} o={overview} done={open} />
    ) : (
      <Coverage id={campaignId} open={open} />
    );
  return (
    <main className="campaign-page space-y-5 pb-28">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-teal-700">
            Modo organización
          </p>
          <h1 className="truncate text-2xl font-bold">
            {overview.campaign.name}
          </h1>
          <span className="inline-flex rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">
            {overview.campaign.roleLabel}
          </span>
        </div>
        <Link
          className="campaign-secondary shrink-0 px-3 text-sm"
          href="/campanas"
        >
          <ChevronLeft className="h-4 w-4" />
          Salir del modo organización
        </Link>
      </header>
      {content}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid w-full max-w-md grid-cols-4 border-t bg-white px-2 pb-3 pt-2">
        {(
          [
            ["Inicio", ClipboardList],
            ["Participantes", UsersRound],
            ["Agregar", Plus],
            ["Cobertura", CalendarDays],
          ] as const
        ).map(([l, I]) => (
          <button
            key={l}
            onClick={() => setTab(l)}
            className={`min-h-14 rounded-xl text-xs font-semibold ${tab === l ? "bg-teal-100 text-teal-800" : "text-slate-600"}`}
          >
            <I className="mx-auto mb-1 h-5 w-5" />
            {l}
          </button>
        ))}
      </nav>
    </main>
  );
}
function Home({
  id,
  o,
  go,
}: {
  id: string;
  o: Overview;
  go: (v: "Inicio" | "Participantes" | "Agregar" | "Cobertura") => void;
}) {
  const missing = o.coverageSummary.missing;
  return (
    <section className="space-y-4">
      <article className="campaign-surface grid grid-cols-3 divide-x p-4 text-center">
        <div>
          <b className="block text-xl">{o.participantCount}</b>
          <span className="text-xs">inscritos</span>
        </div>
        <div>
          <b className="block text-xl">{missing || "✓"}</b>
          <span className="text-xs">
            {missing ? "necesitan apoyo" : "todos cubiertos"}
          </span>
        </div>
        <div>
          <b className="block text-sm">
            {o.campaign.status === "registration_open"
              ? "Abiertas"
              : "En curso"}
          </b>
          <span className="text-xs">inscripciones</span>
        </div>
      </article>
      <button
        className="campaign-primary w-full"
        onClick={() => go("Participantes")}
      >
        Ver participantes
      </button>
      <button
        className="campaign-secondary w-full"
        onClick={() => go("Agregar")}
      >
        Agregar participante
      </button>
      <ShareRegistration campaignId={id} campaignName={o.campaign.name} />
      {missing > 0 && (
        <button
          className="flex w-full justify-between px-2 font-semibold text-amber-800"
          onClick={() => go("Cobertura")}
        >
          Ver horarios que necesitan apoyo <ChevronRight />
        </button>
      )}
    </section>
  );
}
function ShareRegistration({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const [canShare, setCanShare] = useState(false),
    [notice, setNotice] = useState(""),
    [manual, setManual] = useState("");
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);
  const url = () => joinShareUrl(window.location.origin, campaignId);
  const share = async () => {
    const registrationUrl = url();
    if (canShare) {
      try {
        await navigator.share({
          title: campaignName,
          text: "Inscríbete en esta campaña y registra tu disponibilidad.",
          url: registrationUrl,
        });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setNotice("✓ Enlace copiado");
    } catch {
      setManual(registrationUrl);
    }
  };
  return (
    <section className="space-y-2">
      <button
        className="campaign-secondary w-full gap-2"
        onClick={() => void share()}
      >
        <Share2 className="h-5 w-5" />
        {canShare ? "Compartir inscripción" : "Copiar enlace"}
      </button>
      {notice && (
        <p role="status" className="text-sm font-semibold text-teal-800">
          {notice}
        </p>
      )}
      {manual && (
        <label className="block text-sm">
          Copia este enlace
          <input className={`${field} mt-1`} readOnly value={manual} />
        </label>
      )}
    </section>
  );
}
function People({
  id,
  initial,
  clear,
}: {
  id: string;
  initial: string | null;
  clear: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [days, setDays] = useState<Day[]>([]),
    [congs, setCongs] = useState<Cong[]>([]),
    [total, setTotal] = useState(0),
    [f, setF] = useState({ q: "", congregationId: "", dayId: "", blockId: "" }),
    [detail, setDetail] = useState<Detail | null>(null),
    [mode, setMode] = useState<"list" | "availability" | "partner">("list"),
    [error, setError] = useState("");
  const query = useMemo(
    () =>
      new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString(),
    [f],
  );
  const load = () =>
    campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants${query ? `?${query}` : ""}`,
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        setRows(b.rows);
        setDays(b.days);
        setCongs(b.congregations);
        setTotal(b.total);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    const t = setTimeout(() => void load(), f.q ? 220 : 0);
    return () => clearTimeout(t);
  }, [query]);
  const open = (r: string) =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/${r}`,
    )
      .then(async (x) => {
        const b = await x.json();
        if (!x.ok) throw Error(b.error);
        setDetail(b);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    if (initial) {
      open(initial);
      clear();
    }
  }, [initial]);
  if (detail && mode === "availability")
    return (
      <Availability
        id={id}
        d={detail}
        back={() => setMode("list")}
        saved={() => {
          setMode("list");
          setDetail(null);
          void load();
        }}
      />
    );
  if (detail && mode === "partner")
    return (
      <Partner
        id={id}
        d={detail}
        back={() => setMode("list")}
        saved={() => {
          setMode("list");
          setDetail(null);
          void load();
        }}
      />
    );
  if (detail)
    return (
      <section className="space-y-4">
        <button
          onClick={() => setDetail(null)}
          className="font-semibold text-teal-800"
        >
          <ChevronLeft className="inline" />
          Participantes
        </button>
        <article className="campaign-surface space-y-3 p-5">
          <h2 className="text-2xl font-bold">{detail.fullName}</h2>
          <p>{detail.congregation}</p>
          <p>{detail.phone}</p>
          <p>
            <b>Máximo de turnos</b>
            <br />
            {max(detail.maxTurns)}
          </p>
          <div><h3 className="mb-2 font-bold">Disponibilidad</h3><AvailabilitySummary days={detail.days.map((day) => ({ ...day, blocks: day.blocks.map((block) => ({ ...block, selected: block.available === true })) }))} /></div>
        </article>
        <button
          className="campaign-primary w-full"
          onClick={() => setMode("availability")}
        >
          Editar disponibilidad
        </button>
        <button
          className="campaign-secondary w-full"
          onClick={() => setMode("partner")}
        >
          Gestionar compañero
        </button>
      </section>
    );
  const blocks = days
    .filter((d) => !f.dayId || d.id === f.dayId)
    .flatMap((d) => d.blocks.map((b) => ({ ...b, d })));
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Participantes</h2>
        <p className="text-sm text-slate-600">{total} inscritos</p>
      </div>
      <input
        className={field}
        placeholder="Buscar participante"
        value={f.q}
        onChange={(e) => setF({ ...f, q: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          className={field}
          value={f.congregationId}
          onChange={(e) => setF({ ...f, congregationId: e.target.value })}
        >
          <option value="">Congregación</option>
          {congs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.count || 0})
            </option>
          ))}
        </select>
        <select
          className={field}
          value={f.dayId}
          onChange={(e) => setF({ ...f, dayId: e.target.value, blockId: "" })}
        >
          <option value="">Día</option>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {date(d.date)} ({d.count || 0})
            </option>
          ))}
        </select>
      </div>
      <select
        className={field}
        value={f.blockId}
        onChange={(e) => setF({ ...f, blockId: e.target.value })}
      >
        <option value="">Horario</option>
        {blocks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.startTime}–{b.endTime} ({b.count || 0} disp.)
          </option>
        ))}
      </select>
      {!query ? (
        <div className="campaign-surface p-5 text-center">
          <b>Busca un participante</b>
          <p className="mt-1 text-sm text-slate-600">
            Escribe su nombre o teléfono, o utiliza los filtros para
            encontrarlo.
          </p>
        </div>
      ) : (
        rows.map((r) => (
          <button
            key={r.registrationId}
            className="campaign-surface flex w-full justify-between p-4 text-left"
            onClick={() => open(r.registrationId)}
          >
            <span>
              <b className="block">{r.fullName}</b>
              <span className="text-sm">{r.congregation}</span>
            </span>
            <ChevronRight />
          </button>
        ))
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
function PeopleV2({
  id,
  initial,
  clear,
}: {
  id: string;
  initial: string | null;
  clear: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [days, setDays] = useState<Day[]>([]),
    [congs, setCongs] = useState<Cong[]>([]),
    [total, setTotal] = useState(0),
    [resultTotal, setResultTotal] = useState(0),
    [hasMore, setHasMore] = useState(false);
  const [f, setF] = useState({
    q: "",
    congregationId: "",
    dayId: "",
    blockId: "",
    showAllCongregations: false,
    page: 1,
  });
  const [detail, setDetail] = useState<Detail | null>(null),
    [mode, setMode] = useState<"list" | "availability" | "partner">("list"),
    [error, setError] = useState("");
  const searchKey = useMemo(
    () =>
      JSON.stringify({
        q: f.q,
        congregationId: f.congregationId,
        dayId: f.dayId,
        blockId: f.blockId,
        showAllCongregations: f.showAllCongregations,
      }),
    [f.q, f.congregationId, f.dayId, f.blockId, f.showAllCongregations],
  );
  const query = useMemo(
    () =>
      new URLSearchParams(
        Object.entries(f)
          .map(([k, v]) => [k, k === "q" && String(v).trim().length < 3 ? "" : v])
          .filter(([, v]) => v !== "" && v !== false && v !== 1)
          .map(([k, v]) => [String(k), String(v)]),
      ).toString(),
    [f],
  );
  const load = (signal?: AbortSignal) =>
    campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants${query ? `?${query}` : ""}`,
      { signal },
    )
      .then(async (r) => {
        const b = await r.json();
        if (signal?.aborted) return;
        if (!r.ok) throw Error(b.error);
        setRows((previous) => (b.page > 1 ? [...previous, ...b.rows] : b.rows));
        setDays(b.days);
        setCongs(b.congregations);
        setTotal(b.total);
        setResultTotal(b.resultTotal);
        setHasMore(b.hasMore);
        setError("");
      })
      .catch((e: Error) => { if (!signal?.aborted) setError(e.message); });
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => void load(controller.signal), f.q ? 300 : 0);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);
  useEffect(
    () =>
      setF((current) =>
        current.page === 1 ? current : { ...current, page: 1 },
      ),
    [searchKey],
  );
  const open = (registrationId: string) =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/${registrationId}`,
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        setDetail(body);
      })
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    if (initial) {
      open(initial);
      clear();
    }
  }, [initial]);
  if (detail && mode === "availability")
    return (
      <Availability
        id={id}
        d={detail}
        back={() => setMode("list")}
        saved={() => {
          setMode("list");
          setDetail(null);
          void load();
        }}
      />
    );
  if (detail && mode === "partner")
    return (
      <Partner
        id={id}
        d={detail}
        back={() => setMode("list")}
        saved={() => {
          setMode("list");
          setDetail(null);
          void load();
        }}
      />
    );
  if (detail)
    return (
      <section className="space-y-4">
        <button
          onClick={() => setDetail(null)}
          className="font-semibold text-teal-800"
        >
          <ChevronLeft className="inline" />
          Participantes
        </button>
        <article className="campaign-surface space-y-3 p-5">
          <h2 className="text-2xl font-bold">{detail.fullName}</h2>
          <p>{detail.congregation}</p>
          <p>{detail.phone}</p>
          <p>
            <b>Máximo de turnos</b>
            <br />
            {max(detail.maxTurns)}
          </p>
          <div><h3 className="mb-2 font-bold">Disponibilidad</h3><AvailabilitySummary days={detail.days.map((day) => ({ ...day, blocks: day.blocks.map((block) => ({ ...block, selected: block.available === true })) }))} /></div>
        </article>
        <button
          className="campaign-primary w-full"
          onClick={() => setMode("availability")}
        >
          Editar disponibilidad
        </button>
        <button
          className="campaign-secondary w-full"
          onClick={() => setMode("partner")}
        >
          Gestionar compañero
        </button>
      </section>
    );
  const blocks = days
    .filter((d) => !f.dayId || d.id === f.dayId)
    .flatMap((d) => d.blocks);
  const hasExplicitSearch = Boolean(
    f.q.trim().length >= 3 || f.congregationId || f.dayId || f.blockId || f.showAllCongregations,
  );
  const update = (values: Partial<typeof f>) =>
    setF((current) => ({ ...current, ...values, page: 1 }));
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Participantes</h2>
        <p className="text-sm text-slate-600">
          {total} inscritos
          {hasExplicitSearch ? ` · ${resultTotal} encontrados` : ""}
        </p>
      </div>
      <input
        className={field}
        placeholder="Buscar participante"
        value={f.q}
        onChange={(e) => update({ q: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          className={field}
          value={f.showAllCongregations ? "all" : f.congregationId}
          onChange={(e) =>
            update(
              e.target.value === "all"
                ? { congregationId: "", showAllCongregations: true }
                : {
                    congregationId: e.target.value,
                    showAllCongregations: false,
                  },
            )
          }
        >
          <option value="">Congregación</option>
          <option value="all">Todas las congregaciones ({total})</option>
          {congs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.count || 0})
            </option>
          ))}
        </select>
        <select
          className={field}
          value={f.dayId}
          onChange={(e) => update({ dayId: e.target.value, blockId: "" })}
        >
          <option value="">Todos los días</option>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {date(d.date)} ({d.count || 0})
            </option>
          ))}
        </select>
      </div>
      <select
        className={field}
        value={f.blockId}
        onChange={(e) => update({ blockId: e.target.value })}
      >
        <option value="">Todos los horarios</option>
        {blocks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.startTime}–{b.endTime} ({b.count || 0} disp.)
          </option>
        ))}
      </select>
      {!hasExplicitSearch ? (
        <div className="campaign-surface p-5 text-center">
          <b>Busca un participante</b>
          <p className="mt-1 text-sm text-slate-600">
            Escribe su nombre o teléfono, o utiliza los filtros para
            encontrarlo.
          </p>
        </div>
      ) : (
        <>
          {rows.map((r) => (
            <button
              key={r.registrationId}
              className="campaign-surface flex w-full justify-between p-4 text-left"
              onClick={() => open(r.registrationId)}
            >
              <span>
                <b className="block">{r.fullName}</b>
                <span className="text-sm">{r.congregation}</span>
              </span>
              <ChevronRight />
            </button>
          ))}
          {hasMore && (
            <button
              className="campaign-secondary w-full"
              onClick={() =>
                setF((current) => ({ ...current, page: current.page + 1 }))
              }
            >
              Mostrar más
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
function Availability({
  id,
  d,
  back,
  saved,
}: {
  id: string;
  d: Detail;
  back: () => void;
  saved: () => void;
}) {
  const initial = new Set(
    d.days.flatMap((x) => x.blocks.filter((b) => b.available).map((b) => b.id)),
  );
  const [selected, setSelected] = useState<Set<string>>(initial),
    [limit, setLimit] = useState(d.maxTurns?.toString() ?? ""),
    [message, setMessage] = useState("");
  const save = () =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/${d.registrationId}/availability`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedBlockIds: [...selected],
          maxTurns: limit ? Number(limit) : null,
        }),
      },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        setMessage("✓ Disponibilidad actualizada");
        setTimeout(saved, 500);
      })
      .catch((e: Error) => setMessage(e.message));
  return (
    <section className="space-y-4">
      <button onClick={back} className="font-semibold text-teal-800">
        <ChevronLeft className="inline" />
        Ficha
      </button>
      <h2 className="text-xl font-bold">Editar disponibilidad</h2>
      <select
        className={field}
        value={limit}
        onChange={(e) => setLimit(e.target.value)}
      >
        <option value="">Sin límite</option>
        <option value="1">1 turno</option>
        <option value="2">2 turnos</option>
        <option value="3">3 turnos</option>
      </select>
      {d.days.map((day) => (
        <article key={day.id} className="campaign-surface p-4">
          <b>{date(day.date)}</b>
          {day.blocks.map((b) => (
            <label key={b.id} className="mt-3 flex gap-3">
              <input
                type="checkbox"
                checked={selected.has(b.id)}
                disabled={b.published && selected.has(b.id)}
                onChange={() =>
                  setSelected((s) => {
                    if (b.published && s.has(b.id)) {
                      setMessage(
                        "Este hermano ya tiene un turno publicado en este horario.",
                      );
                      return s;
                    }
                    const n = new Set(s);
                    n.has(b.id) ? n.delete(b.id) : n.add(b.id);
                    return n;
                  })
                }
              />
              {b.startTime}–{b.endTime}
              {b.published ? " · Turno publicado" : ""}
            </label>
          ))}
        </article>
      ))}
      {message && <p role="status">{message}</p>}
      <button className="campaign-primary w-full" onClick={save}>
        Guardar cambios
      </button>
    </section>
  );
}
function Partner({
  id,
  d,
  back,
  saved,
}: {
  id: string;
  d: Detail;
  back: () => void;
  saved: () => void;
}) {
  const [q, setQ] = useState(""),
    [rows, setRows] = useState<Row[]>([]),
    [msg, setMsg] = useState("");
  useEffect(() => {
    setRows([]);
    if (q.trim().length < 3) return;
    const controller = new AbortController();
    const t = setTimeout(
      () =>
        void campaignFetch(
          `/api/campanas/organization/campaigns/${id}/participants?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        )
          .then(async (r) => {
            const b = await r.json();
            if (controller.signal.aborted) return;
            if (!r.ok) throw Error(b.error);
            setRows(
              b.rows.filter((x: Row) => x.registrationId !== d.registrationId),
            );
          })
          .catch((e: Error) => { if (!controller.signal.aborted) setMsg(e.message); }),
      300,
    );
    return () => { clearTimeout(t); controller.abort(); };
  }, [q, id, d.registrationId]);
  const choose = (recipientRegistrationId?: string) =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/${d.registrationId}/companion`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          recipientRegistrationId ? { recipientRegistrationId } : {},
        ),
      },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        saved();
      })
      .catch((e: Error) => setMsg(e.message));
  return (
    <section className="space-y-4">
      <button onClick={back} className="font-semibold text-teal-800">
        <ChevronLeft className="inline" />
        Ficha
      </button>
      <h2 className="text-xl font-bold">Gestionar compañero</h2>
      {d.partner && (
        <button className="campaign-secondary w-full" onClick={() => choose()}>
          Quitar a {d.partner.fullName}
        </button>
      )}
      <input
        className={field}
        placeholder="Buscar por nombre o teléfono"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {rows.map((r) => (
        <button
          key={r.registrationId}
          className="campaign-surface flex w-full justify-between p-4 text-left"
          onClick={() => choose(r.registrationId)}
        >
          <span>
            <b className="block">{r.fullName}</b>
            <span>{r.congregation}</span>
          </span>
          <span>Elegir</span>
        </button>
      ))}
      {msg && <p role="alert">{msg}</p>}
    </section>
  );
}
function Add({
  id,
  o,
  done,
}: {
  id: string;
  o: Overview;
  done: (x: string) => void;
}) {
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [pin, setPin] = useState(""),
    [cong, setCong] = useState(""),
    [limit, setLimit] = useState(""),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [step, setStep] = useState<1 | 2 | 3>(1),
    [lookup, setLookup] = useState<any>(null),
    [congs, setCongs] = useState<Cong[]>([]),
    [msg, setMsg] = useState(""),
    [created, setCreated] = useState<string | null>(null);
  useEffect(() => {
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants`,
    ).then(async (r) => {
      const b = await r.json();
      if (r.ok) setCongs(b.congregations);
    });
  }, [id]);
  useEffect(() => {
    if (!/^\d{8}$/.test(phone)) {
      setLookup(null);
      return;
    }
    const p = normalizeChileanPhone(phone);
    const t = setTimeout(
      () =>
        void campaignFetch(
          `/api/campanas/organization/campaigns/${id}/participants/lookup?phone=${encodeURIComponent(p)}`,
        )
          .then(async (r) => {
            const b = await r.json();
            if (!r.ok) throw Error(b.error);
            setLookup(b);
            if (b.kind !== "new") {
              setName(b.fullName);
              setPin("");
              setCong(b.congregationId ?? "");
            }
          })
          .catch((e: Error) => setMsg(e.message)),
      350,
    );
    return () => clearTimeout(t);
  }, [phone, id]);
  const next = () => {
    if (!/^\d{8}$/.test(phone))
      return setMsg("Ingresa los 8 dígitos del teléfono.");
    if (!lookup) return setMsg("Comprueba el teléfono antes de continuar.");
    if (!cong) return setMsg("Selecciona la congregación del participante.");
    if (lookup.kind === "new" && !/^\d{4,6}$/.test(pin))
      return setMsg("El PIN debe tener de 4 a 6 números.");
    setStep(step === 1 ? 2 : 3);
  };
  const submit = () =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/participants/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: lookup.kind === "new" ? "create" : "add_existing",
          fullName: name,
          phone: lookup.phone,
          pin: lookup.kind === "new" ? pin : undefined,
          congregationId: cong,
          maxTurns: limit ? Number(limit) : null,
          selectedBlockIds: [...selected],
        }),
      },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error);
        if (b.kind === "already_registered") {
          setMsg("Este hermano ya participa en esta campaña.");
          return;
        }
        setCreated(b.registrationId);
      })
      .catch((e: Error) => setMsg(e.message));
  if (created)
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Participante agregado</h2>
        <p className="campaign-surface p-5">
          ✓ Participante agregado correctamente
        </p>
        <button
          className="campaign-primary w-full"
          onClick={() => done(created)}
        >
          Ver participante
        </button>
      </section>
    );
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Agregar participante</h2>
      <p className="text-sm font-semibold text-teal-800">
        1 Datos → 2 Disponibilidad → 3 Confirmar
      </p>
      {step === 1 && (
        <>
          <input
            className={field}
            placeholder="Nombre y apellido"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-3">
            <span className="border-r border-slate-200 pr-3 font-semibold text-slate-700">
              +56 9
            </span>
            <input
              className="min-w-0 flex-1 border-0 px-3 text-base outline-none"
              aria-label="Últimos 8 dígitos del teléfono"
              placeholder="8765 4321"
              inputMode="numeric"
              maxLength={8}
              pattern="[0-9]{8}"
              value={phone}
              onChange={(e) => {
                setPhone(organizerPhoneDigits(e.target.value));
                setLookup(null);
                setMsg("");
              }}
            />
          </div>
          {lookup?.kind === "existing" && (
            <p>Esta persona ya tiene una cuenta. No necesita un PIN nuevo.</p>
          )}
          {lookup?.kind === "already_registered" && (
            <p>Este hermano ya participa en esta campaña.</p>
          )}
          <select
            className={field}
            value={cong}
            onChange={(e) => setCong(e.target.value)}
          >
            <option value="">Selecciona una congregación</option>
            {congs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {lookup?.kind === "new" && (
            <input
              className={field}
              placeholder="PIN inicial"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          )}
          <button className="campaign-primary w-full" onClick={next}>
            Continuar
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <select
            className={field}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          >
            <option value="">Sin límite</option>
            <option value="1">1 turno</option>
            <option value="2">2 turnos</option>
            <option value="3">3 turnos</option>
          </select>
          {o.days.map((d) => (
            <article key={d.id} className="campaign-surface p-4">
              <b>{date(d.date)}</b>
              {d.blocks.map((b) => (
                <label key={b.id} className="mt-2 flex gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(b.id)}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        n.has(b.id) ? n.delete(b.id) : n.add(b.id);
                        return n;
                      })
                    }
                  />
                  {b.startTime}–{b.endTime}
                </label>
              ))}
            </article>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <button className="campaign-secondary" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button className="campaign-primary" onClick={next}>
              Continuar
            </button>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <article className="campaign-surface p-4">
            <b>{name}</b>
            <p>{congs.find((c) => c.id === cong)?.name}</p>
            <p>{lookup?.phone}</p>
            <p>
              {selected.size} horarios · Máximo{" "}
              {max(limit ? Number(limit) : null)}
            </p>
            <p>Compañero acordado: opcional, después desde la ficha.</p>
          </article>
          <div className="grid grid-cols-2 gap-3">
            <button className="campaign-secondary" onClick={() => setStep(2)}>
              Atrás
            </button>
            <button className="campaign-primary" onClick={submit}>
              {lookup?.kind === "existing"
                ? "Agregar a esta campaña"
                : "Crear participante"}
            </button>
          </div>
        </>
      )}
      {msg && <p role="alert">{msg}</p>}
    </section>
  );
}
function Coverage({ id, open }: { id: string; open: (x: string) => void }) {
  const [coverage, setCoverage] = useState<Day[] | null>(null),
    [detail, setDetail] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void campaignFetch(`/api/campanas/organization/campaigns/${id}/coverage`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        if (active) setCoverage(body.coverage);
      })
      .catch((failure: Error) => active && setError(failure.message));
    return () => {
      active = false;
    };
  }, [id]);
  const blocks = (coverage ?? []).flatMap((d) =>
      d.blocks.map((b) => ({ ...b, d })),
    ),
    missing = blocks.filter((b) => b.state === "missing");
  const see = (b: any) =>
    void campaignFetch(
      `/api/campanas/organization/campaigns/${id}/coverage/${b.id}`,
    )
      .then(async (r) => {
        const x = await r.json();
        if (!r.ok) throw Error(x.error);
        setDetail({
          ...x,
          title: `${date(b.d.date)} · ${b.startTime}–${b.endTime}`,
        });
      })
      .catch((failure: Error) => setError(failure.message));
  if (error) return <p role="alert">{error}</p>;
  if (!coverage)
    return (
      <section className="campaign-surface p-5">Cargando cobertura…</section>
    );
  if (!blocks.length)
    return (
      <section className="campaign-surface p-5">
        <h2>Aún no hay cobertura para mostrar</h2>
        <p>
          Cuando la campaña tenga días y horarios configurados, aquí podrás
          revisar cuántos hermanos están disponibles en cada bloque.
        </p>
      </section>
    );
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Cobertura</h2>
      <p>
        {blocks.length} horarios · {blocks.length - missing.length} cubiertos ·{" "}
        {missing.length} necesitan apoyo
      </p>
      {coverage.map((d) => (
        <article key={d.id} className="campaign-surface p-4">
          <b>{date(d.date)}</b>
          {d.blocks.map((b) => (
            <button
              key={b.id}
              className="mt-3 flex w-full justify-between text-left"
              onClick={() => see({ ...b, d })}
            >
              <span>
                <b>
                  {b.startTime}–{b.endTime}
                </b>
                <span className="block text-sm">
                  {b.available} disponibles · Necesarios {b.minimum}
                </span>
              </span>
              <span>
                {b.state === "covered" ? "Cubierto" : `Faltan ${b.missing}`}
              </span>
            </button>
          ))}
        </article>
      ))}
      {detail && (
        <section className="campaign-surface p-4">
          <h3>{detail.title}</h3>
          <p>{detail.participants.length} disponibles</p>
          {detail.participants.map((p: any) => (
            <button
              key={p.registrationId}
              onClick={() => open(p.registrationId)}
              className="block w-full py-2 text-left"
            >
              <b>{p.fullName}</b> — {p.congregation}
            </button>
          ))}
          <details>
            <summary>
              {detail.points.length} puntos activos · Ver detalle
            </summary>
            {detail.points.map((p: any) => (
              <p key={p.name}>
                {p.name} — mínimo {p.minimum}
              </p>
            ))}
          </details>
        </section>
      )}
    </section>
  );
}
