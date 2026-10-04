"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { campaignRepository as repo } from "../repositories/campaign-repository";
import {
  campaignSchema,
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
        campaign.defaultCapacityPerBlock,
        campaign.maxPointsDefault,
      ].join("|")}
      className="mt-4 grid gap-4 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const parsed = campaignSchema.safeParse({
          ...Object.fromEntries(new FormData(event.currentTarget)),
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
          onSaved({ ...campaign, ...parsed.data });
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
      <label className="grid gap-2 text-sm font-semibold">
        Capacidad objetivo por bloque
        <Input
          name="defaultCapacityPerBlock"
          type="number"
          min="0"
          step="1"
          defaultValue={campaign.defaultCapacityPerBlock ?? ""}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Máximo de puntos
        <Input
          name="maxPointsDefault"
          type="number"
          min="0"
          step="1"
          defaultValue={campaign.maxPointsDefault ?? ""}
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
