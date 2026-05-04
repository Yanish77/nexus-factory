import { describe, expect, it } from "vitest";
import { agents } from "@/lib/agents/definitions";
import { routeModel } from "@/lib/models/router";

describe("model routing", () => {
  it("allows only Ultron to use gpt-5.5", () => {
    expect(routeModel("ultron", "gpt-5.5").allowed).toBe(true);

    const specialists = agents.filter((agent) => agent.key !== "ultron");
    for (const specialist of specialists) {
      expect(routeModel(specialist.key, "gpt-5.5").allowed).toBe(false);
    }
  });

  it("routes specialists to cheaper models by default", () => {
    const specialists = agents.filter((agent) => agent.key !== "ultron");

    for (const specialist of specialists) {
      const route = routeModel(specialist.key);

      expect(route.allowed).toBe(true);
      expect(route.model).not.toBe("gpt-5.5");
    }
  });
});
