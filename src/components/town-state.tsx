"use client";
import { useEffect, useState } from "react";
import type { World } from "@/lib/types";
export function useTown(initial: World) {
  const [world, setWorld] = useState(initial);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/v1/world", {
          signal: controller.signal,
        });
        if (response.ok) setWorld(await response.json());
      } catch {}
    }, 20000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);
  return world;
}
