"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { campaignRepository as repo } from "../repositories/campaign-repository";
import {
  campaignSchema,
  campaignInformationSchema,
  congregationSchema,
} from "../schemas/campaign-schemas";
import type {
  Campaign,
  CampaignCongregation,
  Congregation,
} from "../domain/types";
export function CampaignGeneralForm({
  campaign,
  onSaved,
}: {
  campaign: Campaign;
  onSaved: (campaign: Campaign) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      key={[
        campaign.name,
        campaign.description,
        campaign.locationName,
        campaign.locationDetails,
      ].join("|")}
      className="mt-4 grid gap-4 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const parsed = campaignSchema.safeParse({
          ...Object.fromEntries(new FormData(event.currentTarget)),
          // The legacy values remain stored until the point-capacity model is migrated.
          defaultCapacityPerBlock: campaign.defaultCapacityPerBlock,
          maxPointsDefault: campaign.maxPointsDefault,
          status: campaign.status,
        });
        if (!parsed.success) {
          setMessage(parsed.error.issues[0].message);
          return;
        }
        setBusy(true);
        setMessage("Guardando…");
        try {
          await repo.updateCampaign(campaign.id, parsed.data);
          onSaved({ ...campaign, ...parsed.data, status: campaign.status });
          setMessage("Información guardada.");
        } catch {
          setMessage(
            "No se pudo guardar la información. Inténtalo nuevamente.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="grid gap-2 text-sm font-semibold">
        Nombre
        <Input name="name" required defaultValue={campaign.name} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Ubicación general
        <Input name="locationName" defaultValue={campaign.locationName ?? ""} />
      </label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">
        Descripción
        <Textarea
          name="description"
          defaultValue={campaign.description ?? ""}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">
        Detalles de ubicación
        <Textarea
          name="locationDetails"
          defaultValue={campaign.locationDetails ?? ""}
        />
      </label>
      <div className="md:col-span-2">
        <Button
          disabled={busy}
          className="bg-teal-700 text-white hover:bg-teal-800"
        >
          {busy ? "Guardando…" : "Guardar información"}
        </Button>
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      </div>
    </form>
  );
}
export function CampaignCompanionSettings({
  campaign,
  onSaved,
}: {
  campaign: Campaign;
  onSaved: (campaign: Campaign) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const enabled = campaign.companionRequestsEnabled === true;
  return (
    <div className="mt-4 space-y-3 text-sm">
      <p>Estado: <strong>{enabled ? "Disponible para participantes" : "Disponible más adelante"}</strong></p>
      <p className="text-slate-600">Activa esta opción cuando la organización decida abrir las solicitudes para escoger compañero.</p>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("Guardando…");
          try {
            await repo.setCompanionRequestsEnabled(campaign.id, !enabled);
            onSaved({ ...campaign, companionRequestsEnabled: !enabled });
            setMessage(enabled ? "Opción desactivada." : "Opción habilitada.");
          } catch {
            setMessage("No se pudo cambiar esta opción. Inténtalo nuevamente.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {enabled ? "Cerrar solicitudes de compañero" : "Habilitar solicitudes de compañero"}
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}
export function CongregationSettings({ campaignId }: { campaignId: string }) {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [links, setLinks] = useState<CampaignCongregation[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const stops = [
      repo.subscribeCongregations(setCongregations),
      repo.subscribeCampaignCongregations(campaignId, setLinks),
    ];
    return () => stops.forEach((stop) => stop());
  }, [campaignId]);
  async function save(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("Guardando…");
    try {
      await action();
      setMessage("Congregaciones actualizadas.");
      return true;
    } catch {
      setMessage("No se pudo guardar el cambio. Inténtalo nuevamente.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const parsed = congregationSchema.safeParse(
            Object.fromEntries(new FormData(form)),
          );
          if (!parsed.success) {
            setMessage(parsed.error.issues[0].message);
            return;
          }
          if (await save(() => repo.saveCongregation(parsed.data)))
            form.reset();
        }}
      >
        <label className="grid gap-2 text-sm font-semibold">
          Nueva congregación
          <Input name="name" required />
        </label>
        <Button
          disabled={busy}
          className="bg-teal-700 text-white hover:bg-teal-800"
        >
          Crear congregación
        </Button>
      </form>
      <p role="status" className="text-sm">
        {message}
      </p>
      {congregations.length === 0 && (
        <p>No hay congregaciones disponibles todavía.</p>
      )}
      <ul className="space-y-2">
        {congregations.map((congregation) => {
          const link = links.find(
            (entry) => entry.congregationId === congregation.id,
          );
          return (
            <li
              key={congregation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
            >
              <div>
                <p className="font-semibold">{congregation.name}</p>
                <p className="text-sm text-slate-600">
                  {link
                    ? "Participa en esta campaña"
                    : "Disponible para asociar"}
                </p>
              </div>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() =>
                  save(() =>
                    link
                      ? repo.removeCampaignCongregation(link.id)
                      : repo.addCampaignCongregation(
                          campaignId,
                          congregation.id,
                        ),
                  )
                }
              >
                {link ? "Desasociar de campaña" : "Asociar a campaña"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Small configuration form; participant-facing presentation lives outside admin. */
export function CampaignInformationForm({
  campaign,
  onSaved,
}: {
  campaign: Campaign;
  onSaved: (campaign: Campaign) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const info = campaign.information;
  const [contacts, setContacts] = useState(info?.contacts ?? []);
  const [notes, setNotes] = useState(info?.notes ?? []);
  return (
    <form
      className="mt-4 grid gap-6 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const logistics = (prefix: "pickup" | "returnInfo") => ({
          location: String(data.get(`${prefix}Location`) ?? ""),
          schedule: String(data.get(`${prefix}Schedule`) ?? ""),
          instructions: String(data.get(`${prefix}Instructions`) ?? ""),
          mapUrl: String(data.get(`${prefix}MapUrl`) ?? ""),
        });
        const parsed = campaignInformationSchema.safeParse({
          intro: String(data.get("intro") ?? ""),
          generalMapUrl: String(data.get("generalMapUrl") ?? ""),
          pickup: logistics("pickup"),
          returnInfo: logistics("returnInfo"),
          contacts,
          notes,
        });
        if (!parsed.success) {
          setMessage(parsed.error.issues[0]?.message ?? "Revisa los datos.");
          return;
        }
        setBusy(true);
        setMessage("Guardando…");
        try {
          await repo.updateCampaignInformation(campaign.id, parsed.data);
          onSaved({ ...campaign, information: parsed.data });
          setMessage("Información para participantes guardada.");
        } catch {
          setMessage("No se pudo guardar la información.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">
        Introducción
        <Textarea name="intro" defaultValue={info?.intro ?? ""} />
      </label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">
        Mapa general (URL HTTPS)
        <Input name="generalMapUrl" defaultValue={info?.generalMapUrl ?? ""} />
        <span className="font-normal text-slate-500">
          Enlace al lugar principal de la campaña.
        </span>
      </label>
      {(["pickup", "returnInfo"] as const).map((kind) => (
        <fieldset
          key={kind}
          className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
        >
          <legend className="px-1 font-bold">
            {kind === "pickup"
              ? "Retiro de exhibidores"
              : "Devolución de exhibidores"}
          </legend>
          <label className="grid gap-2 text-sm font-semibold">
            Lugar
            <Input
              name={`${kind}Location`}
              defaultValue={info?.[kind]?.location ?? ""}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Horario
            <Input
              name={`${kind}Schedule`}
              defaultValue={info?.[kind]?.schedule ?? ""}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Indicaciones
            <Textarea
              name={`${kind}Instructions`}
              defaultValue={info?.[kind]?.instructions ?? ""}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Enlace de ubicación (opcional)
            <Input
              name={`${kind}MapUrl`}
              defaultValue={info?.[kind]?.mapUrl ?? ""}
            />
          </label>
        </fieldset>
      ))}
      <section className="space-y-3 md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">
            Contactos del equipo organizador
          </h3>
          <Button
            type="button"
            variant="outline"
            disabled={contacts.length >= 12}
            onClick={() =>
              setContacts([
                ...contacts,
                {
                  name: "",
                  role: "",
                  phone: "",
                  allowCall: true,
                  allowWhatsApp: false,
                },
              ])
            }
          >
            Agregar contacto
          </Button>
        </div>
        {contacts.length === 0 && (
          <p className="text-sm text-slate-500">
            Todavía no hay contactos configurados.
          </p>
        )}
        {contacts.map((row, index) => (
          <fieldset
            key={index}
            className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"
          >
            <legend className="px-1 text-sm font-semibold">
              Contacto {index + 1}
            </legend>
            <label className="grid gap-2 text-sm font-semibold">
              Nombre
              <Input
                required
                value={row.name}
                onChange={(e) =>
                  setContacts(
                    contacts.map((r, i) =>
                      i === index ? { ...r, name: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Rol
              <Input
                value={row.role ?? ""}
                onChange={(e) =>
                  setContacts(
                    contacts.map((r, i) =>
                      i === index ? { ...r, role: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Teléfono
              <Input
                required
                value={row.phone}
                onChange={(e) =>
                  setContacts(
                    contacts.map((r, i) =>
                      i === index ? { ...r, phone: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.allowCall}
                  onChange={(e) =>
                    setContacts(
                      contacts.map((r, i) =>
                        i === index ? { ...r, allowCall: e.target.checked } : r,
                      ),
                    )
                  }
                />
                Permitir llamada
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.allowWhatsApp}
                  onChange={(e) =>
                    setContacts(
                      contacts.map((r, i) =>
                        i === index
                          ? { ...r, allowWhatsApp: e.target.checked }
                          : r,
                      ),
                    )
                  }
                />
                Permitir WhatsApp
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setContacts(contacts.filter((_, i) => i !== index))
                }
              >
                Quitar contacto {index + 1}
              </Button>
            </div>
          </fieldset>
        ))}
      </section>
      <section className="space-y-3 md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Indicaciones importantes</h3>
          <Button
            type="button"
            variant="outline"
            disabled={notes.length >= 20}
            onClick={() => setNotes([...notes, { title: "", body: "" }])}
          >
            Agregar indicación
          </Button>
        </div>
        {notes.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-xl border border-slate-200 p-4"
          >
            <label className="grid gap-2 text-sm font-semibold">
              Título de indicación {index + 1}
              <Input
                required
                value={row.title}
                onChange={(e) =>
                  setNotes(
                    notes.map((r, i) =>
                      i === index ? { ...r, title: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Detalle
              <Textarea
                value={row.body ?? ""}
                onChange={(e) =>
                  setNotes(
                    notes.map((r, i) =>
                      i === index ? { ...r, body: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="justify-self-end"
              onClick={() => setNotes(notes.filter((_, i) => i !== index))}
            >
              Quitar indicación {index + 1}
            </Button>
          </div>
        ))}
      </section>
      <div className="md:col-span-2">
        <Button
          disabled={busy}
          className="bg-teal-700 text-white hover:bg-teal-800"
        >
          {busy ? "Guardando…" : "Guardar información participante"}
        </Button>
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      </div>
    </form>
  );
}
