import { notFound } from "next/navigation";

/** Legacy URL retained to avoid touching historical Firestore records. */
export default function Page() {
  notFound();
}
