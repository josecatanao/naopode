(function () {
  const localPrefix = "nao-pode-room:";
  const supabaseConfig = window.NAO_PODE_SUPABASE || {};
  const supabaseUrl = String(supabaseConfig.url || "").trim();
  const supabaseKey = String(supabaseConfig.publishableKey || supabaseConfig.anonKey || "").trim();
  const hasSupabase = Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("SUA_URL") &&
    !supabaseKey.includes("SUA_CHAVE") &&
    window.supabase?.createClient
  );
  const supabaseClient = hasSupabase
    ? window.supabase.createClient(supabaseUrl, supabaseKey, {
      realtime: { params: { eventsPerSecond: 20 } }
    })
    : null;

  function createRoomCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function roomLink(code) {
    const publicAppUrl = String(supabaseConfig.publicAppUrl || "").trim();
    const url = new URL(publicAppUrl || window.location.href);
    url.searchParams.set("room", code);
    return url.toString();
  }

  function listenerBag() {
    return {
      state: new Set(),
      forbidden: new Set(),
      connection: new Set(),
      stateRequest: new Set()
    };
  }

  function emit(listeners, type, payload) {
    listeners[type].forEach((listener) => listener(payload));
  }

  function makeSupabaseEndpoint(role, code) {
    const listeners = listenerBag();
    const topic = `room:${code}`;
    const id = `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const channel = supabaseClient.channel(topic, {
      config: {
        broadcast: { self: false },
        presence: { key: id }
      }
    });
    const queue = [];
    let lastState = null;
    let subscribed = false;
    let connected = false;

    function send(type, payload = {}) {
      const message = { ...payload, id, room: code, role, ts: Date.now() };
      const job = () => channel.send({ type: "broadcast", event: type, payload: message });
      if (!subscribed) {
        queue.push(job);
        return;
      }
      job();
    }

    function flush() {
      while (queue.length) queue.shift()();
    }

    function setConnected(value) {
      if (connected === value) return;
      connected = value;
      emit(listeners, "connection", { connected, backend: "supabase", localOnly: false });
    }

    function receive(type, payload) {
      if (!payload || payload.id === id || payload.room !== code) return;

      if (role === "host" && type === "join") {
        setConnected(true);
        if (lastState) send("state", { state: lastState });
      }

      if (role === "host" && type === "request-state") {
        emit(listeners, "stateRequest", payload);
        if (lastState) send("state", { state: lastState });
      }

      if (role === "fiscal" && type === "host-online") {
        setConnected(true);
      }

      if (type === "state") emit(listeners, "state", payload.state);
      if (type === "forbidden") emit(listeners, "forbidden", payload.payload || {});
      if (type === "disconnect") setConnected(false);
    }

    channel
      .on("broadcast", { event: "host-online" }, ({ payload }) => receive("host-online", payload))
      .on("broadcast", { event: "join" }, ({ payload }) => receive("join", payload))
      .on("broadcast", { event: "request-state" }, ({ payload }) => receive("request-state", payload))
      .on("broadcast", { event: "state" }, ({ payload }) => receive("state", payload))
      .on("broadcast", { event: "forbidden" }, ({ payload }) => receive("forbidden", payload))
      .on("broadcast", { event: "disconnect" }, ({ payload }) => receive("disconnect", payload))
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const peers = Object.values(state).flat();
        const wantedRole = role === "host" ? "fiscal" : "host";
        setConnected(peers.some((peer) => peer.role === wantedRole));
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        subscribed = true;
        channel.track({ role, joinedAt: Date.now() });
        flush();
        send(role === "host" ? "host-online" : "join");
      });

    return {
      code,
      id,
      role,
      backend: "supabase",
      localOnly: false,
      get connected() {
        return connected;
      },
      get link() {
        return roomLink(code);
      },
      sendState(state) {
        lastState = state;
        send("state", { state });
      },
      onStateChange(listener) {
        listeners.state.add(listener);
        return () => listeners.state.delete(listener);
      },
      sendForbidden(payload) {
        send("forbidden", { payload });
      },
      requestState() {
        send("request-state");
      },
      onStateRequest(listener) {
        listeners.stateRequest.add(listener);
        return () => listeners.stateRequest.delete(listener);
      },
      onForbidden(listener) {
        listeners.forbidden.add(listener);
        return () => listeners.forbidden.delete(listener);
      },
      onConnectionChange(listener) {
        listeners.connection.add(listener);
        return () => listeners.connection.delete(listener);
      },
      disconnect() {
        send("disconnect");
        channel.untrack();
        supabaseClient.removeChannel(channel);
      }
    };
  }

  function makeLocalEndpoint(role, code) {
    const listeners = listenerBag();
    const channelName = `${localPrefix}${code}`;
    const id = `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(channelName) : null;
    let lastState = null;
    let connected = false;

    function setConnected(value) {
      if (connected === value) return;
      connected = value;
      emit(listeners, "connection", { connected, backend: "local", localOnly: true });
    }

    function post(message) {
      const payload = { ...message, id, room: code, ts: Date.now() };
      channel?.postMessage(payload);
      try {
        localStorage.setItem(channelName, JSON.stringify(payload));
        localStorage.removeItem(channelName);
      } catch {
        // Storage fallback is best effort only.
      }
    }

    function receive(message) {
      if (!message || message.id === id || message.room !== code) return;

      if (role === "host" && message.type === "join") {
        setConnected(true);
        if (lastState) post({ type: "state", state: lastState });
      }

      if (role === "host" && message.type === "request-state") {
        emit(listeners, "stateRequest", message);
        if (lastState) post({ type: "state", state: lastState });
      }

      if (role === "fiscal" && message.type === "host-online") {
        setConnected(true);
      }

      if (message.type === "state") emit(listeners, "state", message.state);
      if (message.type === "forbidden") emit(listeners, "forbidden", message.payload || {});
      if (message.type === "disconnect") setConnected(false);
    }

    channel?.addEventListener("message", (event) => receive(event.data));
    window.addEventListener("storage", (event) => {
      if (event.key !== channelName || !event.newValue) return;
      try {
        receive(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed messages from storage fallback.
      }
    });

    setTimeout(() => post({ type: role === "host" ? "host-online" : "join" }), 50);

    return {
      code,
      id,
      role,
      backend: "local",
      localOnly: true,
      get connected() {
        return connected;
      },
      get link() {
        return roomLink(code);
      },
      sendState(state) {
        lastState = state;
        post({ type: "state", state });
      },
      onStateChange(listener) {
        listeners.state.add(listener);
        return () => listeners.state.delete(listener);
      },
      sendForbidden(payload) {
        post({ type: "forbidden", payload });
      },
      requestState() {
        post({ type: "request-state" });
      },
      onStateRequest(listener) {
        listeners.stateRequest.add(listener);
        return () => listeners.stateRequest.delete(listener);
      },
      onForbidden(listener) {
        listeners.forbidden.add(listener);
        return () => listeners.forbidden.delete(listener);
      },
      onConnectionChange(listener) {
        listeners.connection.add(listener);
        return () => listeners.connection.delete(listener);
      },
      disconnect() {
        post({ type: "disconnect" });
        channel?.close();
      }
    };
  }

  function makeEndpoint(role, code) {
    return hasSupabase
      ? makeSupabaseEndpoint(role, code)
      : makeLocalEndpoint(role, code);
  }

  window.NaoPodeSync = {
    backend: hasSupabase ? "supabase" : "local",
    configured: hasSupabase,
    createRoom() {
      return makeEndpoint("host", createRoomCode());
    },
    joinRoom(code) {
      return makeEndpoint("fiscal", String(code || "").trim());
    }
  };
})();
