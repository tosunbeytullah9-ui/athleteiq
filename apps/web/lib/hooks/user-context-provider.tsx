"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Role = "admin" | "coach" | "athlete";

export interface ServerUserContext {
  role: Role | null;
  orgId: string | null;
  teamId: string | null;
  /** Org'un açık hesap silme talebi sayısı — yalnızca admin için sayılır, diğerlerinde 0. */
  pendingDeletionCount?: number;
}

const Ctx = createContext<ServerUserContext>({
  role: null,
  orgId: null,
  teamId: null,
  pendingDeletionCount: 0,
});

/**
 * Server'da okunan membership bilgisini (role/org/team) client component'lere
 * iletir. `aiq_role` cookie'si httpOnly olduğu için `document.cookie` ile
 * okunamaz — bu yüzden rol bilgisi SSR'da bu provider üzerinden geçer.
 */
export function UserContextProvider({
  value,
  children,
}: {
  value: ServerUserContext;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useServerUserContext(): ServerUserContext {
  return useContext(Ctx);
}
