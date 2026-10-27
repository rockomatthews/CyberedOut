export type CharacterDesign = {
  name: string;
  role: string;
  body: string;
  accent: string;
  visor: string;
  height: number;
  brief: string;
};
export const defaultDesign: CharacterDesign = {
  name: "Your Dot",
  role: "Wanderer",
  body: "#3b4852",
  accent: "#7dff4f",
  visor: "#63daff",
  height: 1.8,
  brief:
    "A friendly bipedal cybernetic resident. Clear arms and legs, practical boots, a compact backpack, charcoal workwear and luminous green details. Full body, A-pose, facing forward, neutral background.",
};
export const CHARACTER_KEY = "cyberedout-character-v1";
export function parseDesign(value: unknown): CharacterDesign {
  if (!value || typeof value !== "object") return { ...defaultDesign };
  const v = value as Record<string, unknown>;
  const color = (key: string) =>
    typeof v[key] === "string" && /^#[a-f0-9]{6}$/i.test(v[key] as string)
      ? (v[key] as string)
      : defaultDesign[key as "body" | "accent" | "visor"];
  return {
    name: typeof v.name === "string" ? v.name.slice(0, 32) : defaultDesign.name,
    role: typeof v.role === "string" ? v.role.slice(0, 80) : defaultDesign.role,
    body: color("body"),
    accent: color("accent"),
    visor: color("visor"),
    height:
      typeof v.height === "number" && Number.isFinite(v.height)
        ? Math.min(2.4, Math.max(1.2, v.height))
        : 1.8,
    brief:
      typeof v.brief === "string"
        ? v.brief.slice(0, 3000)
        : defaultDesign.brief,
  };
}

export const ADMISSION_KEY = "cyberedout-character-ready-v1";
