import type { Report, CampaignAssignmentInReport } from '@/types';
import type { ReportFilters } from "@/components/reportes/filtros-reportes-sheet"; // Importamos el tipo ReportFilters

// Función para verificar si una asignación está completamente vacía
function isAssignmentEmpty(assignment: CampaignAssignmentInReport): boolean {
  return (
    assignment.fechaAsignacion === "" &&
    assignment.publicador === "" &&
    assignment.manzanasTrabajadas === "" &&
    assignment.manzanasPendientes === "" &&
    assignment.nombreCampana === null
  );
}

// Datos crudos de los territorios y sus asignaciones
// Se ha añadido y limpiado los datos de los 84 territorios.
const rawData: Report[] = [
  {
    "numeroTerritorio": 1,
    "asignaciones": [
      {
        "fechaAsignacion": "23/11/2024",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "8/03/2025",
        "publicador": "Edison Díaz",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "20/03/2025",
        "publicador": "Robert Guale",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "26/04/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "1/05/2025",
        "publicador": "Robert Guale",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "20/06/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 2,
    "asignaciones": [
      {
        "fechaAsignacion": "14/12/2024",
        "publicador": "Carlos Heise",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "8/03/2025",
        "publicador": "Edison Díaz",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "20/03/2025",
        "publicador": "Robert Guale",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "26/04/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "20/06/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 3,
    "asignaciones": [
      {
        "fechaAsignacion": "8/01/2025",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "8/03/2025",
        "publicador": "Edison Díaz",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "22/03/2025",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "24/04/2025",
        "publicador": "Jimmy Guale",
        "completadoAsignacion": false,
        "manzanasTrabajadas": "1",
        "manzanasPendientes": "2 a 4",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "15/05/2025",
        "publicador": "Robert Guale",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "2 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 4,
    "asignaciones": [
      {
        "fechaAsignacion": "6/11/2024",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "1/03/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": false,
        "manzanasTrabajadas": "3",
        "manzanasPendientes": "1 y 2",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "21/03/2025",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "18/04/2025",
        "publicador": "Jimmy Guale",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "22/05/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": false,
        "manzanasTrabajadas": "3",
        "manzanasPendientes": "1 a 2",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 5,
    "asignaciones": [
      {
        "fechaAsignacion": "18/12/2024",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "1/03/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "22/03/2025",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "31/05/2025",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 6,
    "asignaciones": [
      {
        "fechaAsignacion": "11/12/2024",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "22/03/2025",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "1/05/2025",
        "publicador": "Camilo Torres",
        "completadoAsignacion": false,
        "manzanasTrabajadas": "4",
        "manzanasPendientes": "1 a 3",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "16/05/2025",
        "publicador": "Carlos Heise",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 7,
    "asignaciones": [
      {
        "fechaAsignacion": "28/12/2024",
        "publicador": "Gonzalo Heise",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/03/2025",
        "publicador": "Jimmy Guale",
        "completadoAsignacion": false,
        "manzanasTrabajadas": "2",
        "manzanasPendientes": "1",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "28/03/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "19/04/2025",
        "publicador": "Edison Díaz",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 8,
    "asignaciones": [
      {
        "fechaAsignacion": "11/12/2024",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "4/04/2025",
        "publicador": "Robert Guale",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "19/04/2025",
        "publicador": "Edison Díaz",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "07/06/2025",
        "publicador": "Camilo Torres",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 9,
    "asignaciones": [] // Asignaciones vacías eliminadas
  },
  {
    "numeroTerritorio": 10,
    "asignaciones": [
      {
        "fechaAsignacion": "4/01/2025",
        "publicador": "Gonzalo Heise",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/03/2025",
        "publicador": "Ricardo Salas",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "27/05/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 11,
    "asignaciones": [
      {
        "fechaAsignacion": "23/11/2024",
        "publicador": "Carlos Heise",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "18/01/2025",
        "publicador": "Jimmy Guale",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/03/2025",
        "publicador": "Ricardo Salas",
        "completadoAsignacion": false,
        "manzanasTrabajadas": "3",
        "manzanasPendientes": "1 y 2",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "25/03/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/05/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 12,
    "asignaciones": [
      {
        "fechaAsignacion": "30/11/2024",
        "publicador": "Carlos Heise",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "25/01/2025",
        "publicador": "Carlos Heise",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "15/02/2025",
        "publicador": "Gonzalo Heise",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "25/03/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      }
    ]
  },
  {
    "numeroTerritorio": 13,
    "asignaciones": [] // Asignaciones vacías eliminadas
  },
  {
    "numeroTerritorio": 14,
    "asignaciones": [
      {
        "fechaAsignacion": "26/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      }
    ]
  },
  {
    "numeroTerritorio": 15,
    "asignaciones": [
      {
        "fechaAsignacion": "26/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      }
    ]
  },
  {
    "numeroTerritorio": 16,
    "asignaciones": [
      {
        "fechaAsignacion": "26/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      }
    ]
  },
  {
    "numeroTerritorio": 17,
    "asignaciones": [
      {
        "fechaAsignacion": "26/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 y 2",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      }
    ]
  },
  {
    "numeroTerritorio": 18,
    "asignaciones": [
      {
        "fechaAsignacion": "26/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      }
    ]
  },
  {
    "numeroTerritorio": 19,
    "asignaciones": [
      {
        "fechaAsignacion": "26/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      }
    ]
  },
  {
    "numeroTerritorio": 20,
    "asignaciones": [] // Asignaciones vacías eliminadas
  },
  {
    "numeroTerritorio": 21,
    "asignaciones": [] // Asignaciones vacías eliminadas
  },
  {
    "numeroTerritorio": 22,
    "asignaciones": [] // Asignaciones vacías eliminadas
  },
  {
    "numeroTerritorio": 23,
    "asignaciones": [
      {
        "fechaAsignacion": "18/03/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración "
      }
    ]
  },
  {
    "numeroTerritorio": 24,
    "asignaciones": [
      {
        "fechaAsignacion": "18/03/2025",
        "publicador": "Esteban Vásquez",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración "
      }
    ]
  },
  {
    "numeroTerritorio": 25,
    "asignaciones": [
      {
        "fechaAsignacion": "31/12/2024",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "25/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "13/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 3",
        "manzanasPendientes": "3 a 6",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "14/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "3 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "16/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 26,
    "asignaciones": [
      {
        "fechaAsignacion": "9/01/2024",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "4 a 7",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "31/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": false,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "5 a 7",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "1/02/2025",
        "publicador": "Cristian Pichinao",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "5 a 7",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "12/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 7",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 7",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "23/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 7",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 27,
    "asignaciones": [
      {
        "fechaAsignacion": "31/12/2024",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "25/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "20/02/2025",
        "publicador": "Cristian Pichinao",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "11/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "1/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "22/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 4",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 28,
    "asignaciones": [
      {
        "fechaAsignacion": "17/01/2025",
        "publicador": "Cristian Pichinao",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "25/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "20/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "13/05/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 6",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 29,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 30,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 31,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 32,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 33,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 34,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 35,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 36,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 37,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 38,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 39,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 40,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 41,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 42,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 43,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 44,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 45,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 46,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 47,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 48,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 49,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 50,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 51,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 52,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 53,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 54,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 55,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 56,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 57,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 58,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 59,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 60,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 61,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 62,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 63,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 64,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 65,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 66,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 67,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 68,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 69,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 70,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 71,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 72,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 73,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 74,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 75,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 76,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 77,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 78,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 79,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 80,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 81,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 82,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 83,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  },
  {
    "numeroTerritorio": 84,
    "asignaciones": [
      {
        "fechaAsignacion": "20/01/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "27/02/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "29/03/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": true,
        "nombreCampana": "Camp. Conmemoración"
      },
      {
        "fechaAsignacion": "15/04/2025",
        "publicador": "Rolando Alarcón",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      },
      {
        "fechaAsignacion": "19/05/2025",
        "publicador": "Jonatan Palma",
        "completadoAsignacion": true,
        "manzanasTrabajadas": "1 a 5",
        "manzanasPendientes": "",
        "esCampanaEspecial": false,
        "nombreCampana": null
      }
    ]
  }
].map(territory => ({
  ...territory,
  asignaciones: territory.asignaciones.filter(assignment => !isAssignmentEmpty(assignment))
}));

/**
 * Procesa los datos de los reportes basándose en los filtros proporcionados.
 * Actualmente, esta función devuelve los datos crudos, pero con las asignaciones vacías eliminadas.
 * En el futuro, se puede añadir lógica para filtrar, ordenar o transformar aún más los datos.
 *
 * @param filters Los filtros a aplicar en el procesamiento de los reportes.
 * @returns Un objeto que contiene los territorios procesados, tipado como ReporteS13Data.
 */
export function processReportData(filters: ReportFilters): { territories: Report[] } {
  // Aquí puedes añadir la lógica para filtrar, ordenar o transformar 'rawData'
  // basándose en los 'filters'.
  // Por ejemplo:
  // let filteredData = rawData.filter(report => {
  //   // Lógica de filtrado
  //   return true; // placeholder
  // });

  // Devolvemos los datos ya procesados (sin asignaciones vacías y con todos los territorios).
  return { territories: rawData };
}
