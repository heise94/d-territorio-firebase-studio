import type { CampaignStatus } from './types';

// Fase 1 solo permite preparar una campaña y abrir inscripciones.
// Planificación, publicación y cierre quedan reservados a sus fases.
export function canTransitionCampaignStatus(from: CampaignStatus, to: CampaignStatus) {
  return from === to || (from === 'draft' && to === 'registration_open');
}
