import "server-only";
import { after } from "next/server";
import { dispatchPushOutbox } from "./push-delivery";

/** Request-lifetime continuation; infrastructure job also recovers pending retries.
 * Tests invoking Route Handlers outside Next have no after() request context. */
export function schedulePushDelivery() {
  try {
    after(async () => {
      try {
        // Drain a normal 40–80-person publication, without an unbounded request.
        // Remaining events/retries stay durable for the protected infrastructure job.
        for (let batch = 0; batch < 4; batch++) {
          if ((await dispatchPushOutbox({ limit: 50 })).processed < 50) break;
        }
      } catch {
        /* Pending outbox is durable. Never log credentials or undo a committed domain action. */
      }
    });
  } catch {
    /* No request context: integration tests dispatch explicitly with a fake sender. */
  }
}
