
import type { Territory, Assignment } from '@/types';

// Por favor, reemplaza este contenido con tu JSON de datos.
// Asegúrate de que los arrays mantengan los nombres MOCK_TERRITORIES y MOCK_ASSIGNMENTS.

export const MOCK_TERRITORIES: Territory[] = [
  {
    id: 'T-01',
    name: 'Territorio de Ejemplo 1',
    number: '1',
    type: 'urban',
    isBlocked: false,
    createdAt: new Date() as any, // Cast to any to avoid Timestamp issues in mock
    updatedAt: new Date() as any,
    totalBlocks: 5,
    blockHouseCounts: [10, 12, 8, 15, 9],
    approxHouseCount: 54,
    lastWorked: '2024-05-20',
  },
  {
    id: 'T-02',
    name: 'Territorio Rural Ejemplo',
    type: 'rural',
    isBlocked: true,
    blockReason: 'Acceso cerrado por temporada.',
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
  }
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'A-01',
    locationId: 'T-01',
    locationName: 'Territorio de Ejemplo 1',
    date: '2024-05-20',
    time: '10:00',
    status: 'accepted',
    type: 'publica',
    userName: 'Juan Pérez',
    lastReportData: {
      assignmentId: 'A-01',
      reportedAt: new Date() as any,
      reportedByUserId: 'user-123',
      reports: [
        {
          territoryId: 'T-01',
          territoryName: 'Territorio de Ejemplo 1',
          workedBlocksIds: ['block-T-01-1', 'block-T-01-2', 'block-T-01-3', 'block-T-01-4', 'block-T-01-5']
        }
      ]
    }
  },
  {
    id: 'A-02',
    locationId: 'T-03', // Un-matched territory
    locationName: 'Territorio sin datos',
    date: '2024-06-01',
    time: '15:00',
    status: 'pending',
    type: 'publica',
    userName: 'Maria Silva'
  }
];
