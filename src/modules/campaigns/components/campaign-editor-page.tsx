"use client";
import { useEffect, useState } from "react";
import type { Campaign } from "../domain/types";
import { campaignRepository } from "../repositories/campaign-repository";
import { CampaignEditor } from "./campaign-admin-v2";

export function CampaignEditorPage({ campaignId }: { campaignId: string }) {
 const [campaign,setCampaign]=useState<Campaign|null>(null);
 useEffect(()=>campaignRepository.subscribeCampaigns((rows)=>setCampaign(rows.find(row=>row.id===campaignId)??null)),[campaignId]);
 if(!campaign)return <main className="p-8 text-slate-600">Cargando campaña…</main>;
 return <CampaignEditor campaign={campaign} back={() => { window.location.href="/campanas/admin"; }} />;
}
