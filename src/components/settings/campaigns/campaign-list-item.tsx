
// This file can be removed if not used, or developed further for more complex list items.
// For now, the campaign list item logic is directly within settings/page.tsx in the Table.
// If we need a more complex, reusable component for campaign list items, we can build it here.

// Example structure if we were to use it:
/*
"use client";

import type { Campaign } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CampaignListItemProps {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaignId: string) => void;
  onToggleActive: (campaignId: string) => void;
}

export function CampaignListItem({ campaign, onEdit, onDelete, onToggleActive }: CampaignListItemProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b hover:bg-muted/50 transition-colors">
      <div>
        <h4 className="font-semibold">{campaign.name} <Badge variant={campaign.isActive ? "default" : "outline"}>{campaign.isActive ? "Activa" : "Inactiva"}</Badge></h4>
        <p className="text-sm text-muted-foreground">
          {new Date(campaign.startDate.seconds * 1000).toLocaleDateString()} - {new Date(campaign.endDate.seconds * 1000).toLocaleDateString()}
        </p>
        <p className="text-xs text-muted-foreground">Tipo: {campaign.type}</p>
        {campaign.description && <p className="text-xs italic mt-1">{campaign.description}</p>}
      </div>
      <div className="flex items-center space-x-2">
        <Switch checked={campaign.isActive} onCheckedChange={() => onToggleActive(campaign.id)} />
        <Button variant="ghost" size="icon" onClick={() => onEdit(campaign)}><Edit className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(campaign.id)} className="text-destructive hover:text-destructive-foreground"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
*/
// Since the table in settings/page.tsx is handling this, this file is effectively a placeholder or can be removed.
// For this iteration, I will make it an empty file to satisfy the multi-file structure if needed for generation,
// or simply not include it in the changes if it's cleaner. Given the plan was to integrate, let's remove direct usage.
// The table in page.tsx will handle the rendering.
export {}; // Ensure it's a module
