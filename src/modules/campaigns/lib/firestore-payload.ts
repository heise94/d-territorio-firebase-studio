/** Remove only undefined fields, including nested optional information fields.
 * Firestore values (timestamps, sentinels, references) retain their prototypes.
 */
export function cleanFirestorePayload<T>(value: T): T {
  if (Array.isArray(value))
    return value
      .filter((item) => item !== undefined)
      .map(cleanFirestorePayload) as T;
  if (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanFirestorePayload(item)]),
    ) as T;
  return value;
}
