import { assertProductionSafety } from "@/lib/safety/production";

let validated = false;

export async function register() {
  if (validated || process.env.NODE_ENV !== "production") {
    return;
  }

  validated = true;
  assertProductionSafety();
}
