"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_ACTOR } from "@/lib/actor";

/** Cambia el usuario simulado (RNF-03 pendiente). Invalida toda la app: cada pantalla depende de quién mira. */
export async function cambiarActor(formData: FormData) {
  const id = Number(formData.get("actor"));
  if (!Number.isInteger(id) || id <= 0) return;
  const store = await cookies();
  store.set(COOKIE_ACTOR, String(id), { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}
