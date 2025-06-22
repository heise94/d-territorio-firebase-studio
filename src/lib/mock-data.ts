
import { UserProfile } from "@/types";
import { USER_ROLES } from "@/lib/constants";
import { Timestamp } from "firebase/firestore";

// This is a centralized mock data source for development and testing.
// In a real application, this data would be fetched from Firestore.

export const MOCK_ALL_USERS_DATA: UserProfile[] = [
    // Special Roles
    { id: "uidAdmin", name: "Pedro Velez (Admin)", email: "admin@example.com", phoneNumber: "+56955555555", availability: { availableSlotIds: ["sat-1000-gen"] }, role: USER_ROLES.ENCARGADO_TERRITORIO, status: "Activo", firebaseAuthUid: "uidAdmin", adminApprovalStatus: "approved" },
    { id: "uidSG1", name: "Sofía Castro (SG G1)", email: "sg1@example.com", phoneNumber: "+56966666666", availability: { availableSlotIds: ["fri-1000-gen", "sun-1500-zoom"] }, assignedGroupId: "G1", role: USER_ROLES.SG, status: "Activo", firebaseAuthUid: "uidSG1", adminApprovalStatus: "approved" },
    { id: "uidAux2", name: "Laura Nuñez (Auxiliar G2)", email: "aux2@example.com", phoneNumber: "+56988888888", availability: { availableSlotIds: ["wed-0930-gen"] }, assignedGroupId: "G2", role: USER_ROLES.AUXILIAR_TERRITORIO, status: "Activo", firebaseAuthUid: "uidAux2", adminApprovalStatus: "approved" },
    // Publishers from historical data
    { id: "uidPub1", name: "Camilo Torres", email: "camilo.torres@example.com", phoneNumber: "", availability: {}, assignedGroupId: "G1", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub1", adminApprovalStatus: "approved" },
    { id: "uidPub2", name: "Edison Díaz", email: "edison.diaz@example.com", phoneNumber: "", availability: {}, assignedGroupId: "G1", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub2", adminApprovalStatus: "approved" },
    { id: "uidPub3", name: "Robert Guale", email: "robert.guale@example.com", phoneNumber: "", availability: {}, assignedGroupId: "G1", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub3", adminApprovalStatus: "approved" },
    { id: "uidPub4", name: "Esteban Vásquez", email: "esteban.vasquez@example.com", phoneNumber: "", availability: {}, assignedGroupId: "G1", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub4", adminApprovalStatus: "approved" },
    { id: "uidPub5", name: "Carlos Heise", email: "carlos.heise@example.com", phoneNumber: "", availability: {}, assignedGroupId: "G2", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub5", adminApprovalStatus: "approved" },
    { id: "uidPub6", name: "Jimmy Guale", email: "jimmy.guale@example.com", phoneNumber: "", availability: {}, assignedGroupId: "G2", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub6", adminApprovalStatus: "approved" },
    { id: "uidPub7", name: "Gonzalo Heise", email: "gonzalo.heise@example.com", phoneNumber: "", availability: {}, assignedGroupId: "G2", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub7", adminApprovalStatus: "approved" },
    { id: "uidPub8", name: "Ricardo Salas", email: "ricardo.salas@example.com", phoneNumber: "", availability: {}, assignedGroupId: "G2", role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub8", adminApprovalStatus: "approved" },
    { id: "uidPub9", name: "Rolando Alarcón", email: "rolando.alarcon@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub9", adminApprovalStatus: "approved" },
    { id: "uidPub10", name: "Jonatan Palma", email: "jonatan.palma@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub10", adminApprovalStatus: "approved" },
    { id: "uidPub11", name: "Cristian Pichinao", email: "cristian.pichinao@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub11", adminApprovalStatus: "approved" },
    { id: "uidPub12", name: "Diego Henríquez", email: "diego.henriquez@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub12", adminApprovalStatus: "approved" },
    { id: "uidPub13", name: "Cristian Coronado", email: "cristian.coronado@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub13", adminApprovalStatus: "approved" },
    { id: "uidPub14", name: "Carlos Sepúlveda", email: "carlos.sepulveda@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub14", adminApprovalStatus: "approved" },
    { id: "uidPub15", name: "Omar Salas", email: "omar.salas@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub15", adminApprovalStatus: "approved" },
    { id: "uidPub16", name: "Javier Heise", email: "javier.heise@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub16", adminApprovalStatus: "approved" },
    { id: "uidPub17", name: "Mauricio Flores", email: "mauricio.flores@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub17", adminApprovalStatus: "approved" },
    { id: "uidPub18", name: "Nelsón Muci", email: "nelson.muci@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub18", adminApprovalStatus: "approved" },
    { id: "uidPub19", name: "Martín Sandoval", email: "martin.sandoval@example.com", phoneNumber: "", availability: {}, role: USER_ROLES.PUBLICADOR, status: "Activo", firebaseAuthUid: "uidPub19", adminApprovalStatus: "approved" },
];
