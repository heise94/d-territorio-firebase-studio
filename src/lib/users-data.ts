
import { USER_ROLES } from '@/lib/constants';
import type { UserRole } from '@/types';

// Helper function to create a placeholder email
const normalizeEmail = (name: string, surname: string) => {
    // A simple normalization to remove accents and convert to lowercase
    const normalizedName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedSurname = surname.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ')[0]; // Use first part of surname
    return `${normalizedName}.${normalizedSurname}@example.com`;
}

// Data cleaned and formatted from the user's JSON
export const usersToImport = [
  { name: "Matias Acuña", email: normalizeEmail("Matias", "Acuña"), phoneNumber: "", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Luis Alarcón", email: "luisignacio.alarcon@gmail.com", phoneNumber: "+56981482742", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Rolando Alarcón", email: "rola1900@hotmail.com", phoneNumber: "+56981429264", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Diego Barrios", email: "diegobarrioslagos@gmail.com", phoneNumber: "+56932959514", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Cristian Coronado", email: "cristian.coronado.pantoja@gmail.com", phoneNumber: "+56945292082", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Emilio Dalidet", email: "gilmadalidetvergara@gmail.com", phoneNumber: "+56992945568", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Edison Díaz", email: "edisondiazreyes@gmail.com", phoneNumber: "+56998975848", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Nahuel Díaz", email: normalizeEmail("Nahuel", "Díaz"), phoneNumber: "", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Edwin Duque", email: "edwindu13003@gmail.com", phoneNumber: "+56940449897", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Danilo Escobar", email: "danilogabriel1111@gmail.com", phoneNumber: "+56935143886", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Edson Fuentealba", email: normalizeEmail("Edson", "Fuentealba"), phoneNumber: "+56934179022", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Juan Fuentes hijo", email: normalizeEmail("Juan", "Fuentes hijo"), phoneNumber: "", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Juan Fuentes", email: normalizeEmail("Juan", "Fuentes"), phoneNumber: "+56946255233", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Víctor Gallardo", email: normalizeEmail("Víctor", "Gallardo"), phoneNumber: "", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Sadoc Garrido", email: "sadox.gb2011@gmail.com", phoneNumber: "+56959901521", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Jimmy Guale", email: "jimmygualee@gmail.com", phoneNumber: "+56961126307", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Roberth Guale", email: "roberthgregorio97@gmail.com", phoneNumber: "+56947531515", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Carlos Heise", email: "carlos.heiseg@gmail.com", phoneNumber: "+56991817134", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Gonzalo Heise", email: "Gheise.jw@gmail.com", phoneNumber: "+56965927134", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Javier Heise", email: "javier.heisse@gmail.com", phoneNumber: "+56936316862", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Sebastián Heise", email: "her.hor.re@gmail.com", phoneNumber: "+56971785912", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Diego Henríquez", email: "diego16h@gmail.com", phoneNumber: "+56954075671", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Arturo Hidalgo", email: normalizeEmail("Arturo", "Hidalgo"), phoneNumber: "", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "José Huaitro", email: "constructor.joseluish@gmail.com", phoneNumber: "+56942558208", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Luis Huaitro", email: "telohuait@gmail.com", phoneNumber: "+56979723049", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Victor Jara", email: "victorjara1junio1947@gmail.com", phoneNumber: "+56956211935", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Luis Jeldres", email: "Luisjeldres456@gmail.com", phoneNumber: "+56941006478", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Vicente Jeldres", email: normalizeEmail("Vicente", "Jeldres"), phoneNumber: "+56979480327", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Gustavo Jiménez", email: "gustjim03@gmail.com", phoneNumber: "+56979912185", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "José Lagos", email: "jose_lagos_rivas@hotmail.com", phoneNumber: "+56981744482", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Christian Martínez", email: "c.martinez.jw@gmail.com", phoneNumber: "+56981466004", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Vicente Millañir", email: "elena.colinir@icloud.com", phoneNumber: "+56968464927", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Jorge Montero", email: normalizeEmail("Jorge", "Montero"), phoneNumber: "+56972554945", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Fernando Moreno", email: "f.morenojw@gmail.com", phoneNumber: "+56978424417", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Gustavo Moreno", email: "cid.moreno16@gmail.com", phoneNumber: "+56947461405", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Antonio Muci", email: "antoniomucic@gmail.com", phoneNumber: "+56993475896", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Nelson Muci", email: "nelsonmuci@gmail.com", phoneNumber: "+56982605830", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Dario Muñoz", email: "esoldar2006@gmail.com", phoneNumber: "+56948719536", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Agustin Navarrete", email: "edicri1987@gmail.com", phoneNumber: "+56920130605", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Héctor Pacheco", email: normalizeEmail("Héctor", "Pacheco"), phoneNumber: "+56962428782", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Jonatan Palma", email: "jonatan.palmab@gmail.com", phoneNumber: "+56953104793", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Benjamín Pichinao", email: "bpichinao3@gmail.com", phoneNumber: "+56958515064", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Cristian Pichinao", email: "cpbenjito@gmail.com", phoneNumber: "+56951591547", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Carlos Riquelme", email: "carlosriquelmemarin@gmail.com", phoneNumber: "+56998959303", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Isaías Romero", email: "isaias.j.romero.v@gmail.com", phoneNumber: "+56999203496", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Omar Salas", email: "romar.salas@gmail.com", phoneNumber: "+56974999497", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Ricardo Salas", email: "rdanielsalas@gmail.com", phoneNumber: "+56968795549", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Marcos San Martín", email: "marko.4ntonio@gmail.com", phoneNumber: "+56948102313", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Andrés Sánchez", email: normalizeEmail("Andrés", "Sánchez"), phoneNumber: "", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Ferney Sánchez", email: "jhonnuansanchez11@gmail.com", phoneNumber: "+56943476044", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Martín Sandoval", email: "martysanme@gmail.com", phoneNumber: "+56963473969", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Javier Seguel", email: "javierantonioseguelgajardo@gmail.com", phoneNumber: "+56930173250", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Carlos Sepúlveda", email: normalizeEmail("Carlos", "Sepúlveda"), phoneNumber: "", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Nolberto Silva", email: "emiliabernalpuas@gmail.com", phoneNumber: "+56954758655", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Camilo Torres", email: "tcamilohmellado@gmail.com", phoneNumber: "+56933539432", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Eduardo Vásquez", email: "vasquezmellaeduardo@gmail.com", phoneNumber: "+56988189766", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Esteban Vásquez", email: "estebanvasqueztj@gmail.com", phoneNumber: "+56981881558", role: USER_ROLES.PUBLICADOR as UserRole },
  { name: "Hector Zavala", email: "rodrigo.z@hotmail.es", phoneNumber: "+56923960034", role: USER_ROLES.PUBLICADOR as UserRole },
];
