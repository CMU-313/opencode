import { describe, expect, test } from "bun:test"
import { createStore } from "solid-js/store"
import { createDirSyncContext } from "./directory-sync"

function setup() {
  const [store, setStore] = createStore({
    status: "ready",
    path: { directory: "/test" },
    project: "",
    session: [],
    limit: 10,
  } as any)

  const sessions = new Map<string, any>()
  let sessionSetValue: unknown

  const serverSync = {
    child: () => [store, setStore],
    data: { project: [] },

    session: {
      data: {
        session_status: "idle",
      },

      set: (...input: unknown[]) => {
        sessionSetValue = input[1]
      },

      remember: (session: any) => {
        sessions.set(session.id, session)
      },

      get: (id: string) => sessions.get(id),

      optimistic: {
        add: () => undefined,
        remove: () => undefined,
      },

      sync: async () => undefined,
      todo: undefined,
      history: undefined,
      evict: () => undefined,
    },

    mcp: {
      toggle: () => undefined,
    },
  } as any

  const serverSDK = {
    createClient: () => ({}),

    api: {
      session: {
        list: async () => ({ data: [] }),
      },
    },

    protocol: Promise.resolve("v1"),

    client: {
      session: {
        update: async () => undefined,
      },
    },
  } as any

  return {
    context: createDirSyncContext("/test", serverSync, serverSDK),
    store,
    getSessionSetValue: () => sessionSetValue,
  }
}

describe("directory sync", () => {
  test("reads directory data", () => {
    const { context } = setup()

    expect(context.data.status).toBe("ready")
  })

  test("reads shared session data", () => {
    const { context } = setup()

    expect(context.data.session_status).toBe("idle")
  })

  test("set routes session fields to the session store", () => {
    const { context, getSessionSetValue } = setup()

    context.set("session_status", "busy")

    expect(getSessionSetValue()).toBe("busy")
  })

  test("remember adds a session to the directory", () => {
    const { context, store } = setup()

    context.session.remember({
      id: "session-1",
      directory: "/test",
    } as any)

    expect(store.session[0].id).toBe("session-1")
  })

  test("updates an existing remembered session", () => {
    const { context, store } = setup()

    context.session.remember({
      id: "session-1",
      directory: "/test",
      title: "old",
    } as any)

    context.session.remember({
      id: "session-1",
      directory: "/test",
      title: "new",
    } as any)

    expect(store.session.length).toBe(1)
    expect(store.session[0].title).toBe("new")
  })

  test("gets a session belonging to the directory", () => {
    const { context } = setup()

    context.session.remember({
      id: "session-1",
      directory: "/test",
    } as any)

    expect(context.session.get("session-1")?.id).toBe("session-1")
  })

  test("does not get a session from another directory", () => {
    const { context } = setup()

    context.session.remember({
      id: "session-1",
      directory: "/other",
    } as any)

    expect(context.session.get("session-1")).toBeUndefined()
  })
})