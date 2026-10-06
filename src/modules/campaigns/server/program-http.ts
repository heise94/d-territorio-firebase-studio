import "server-only";
import { ProgramValidationError } from "./program-service";
import { dashboardResponse, dashboardFailure } from "./admin-dashboard-http";
export function programFailure(error: unknown) {
  return error instanceof ProgramValidationError
    ? dashboardResponse(
        {
          error: error.message,
          blockingErrors: error.view.blockingErrors,
          warnings: error.view.warnings,
        },
        422,
      )
    : dashboardFailure(error);
}
