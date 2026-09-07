---
title: "MCP: a Common Socket for Tools"
module: "A"
readingMinutes: 5
level: intermediate
order: 5
description: "MCP compresses the M×N integration explosion into M+N: three roles, capability negotiation, and one complete protocol-mediated tool call."
sources:
  - "https://modelcontextprotocol.io/docs/getting-started/intro"
  - "https://modelcontextprotocol.io/specification/latest"
reviewed_at: 2026-09-06
draft: false
demo: "a05-mcp"
---

[T01](/en/learn/t01-function-calling/)'s tool calls carry a hidden premise: the tool lives inside your application's process. Reality is that tools live in other people's houses — databases sit in the DBA's domain, files on the user's machine, GitHub in Microsoft's cloud. Wiring in each new tool means writing another glue codebase — auth, parameter mapping, error handling, each from scratch — and M applications × N tools means M×N glue codebases, each maintained whenever either side upgrades. That is the integration explosion. MCP (Model Context Protocol) collapses M×N into M+N: tool builders implement a server once, application builders implement a client once, and both ends answer only to the protocol. The swim lane timeline above completes one full MCP tool-call round trip.

## Three roles: host, client, server

MCP's role table has three names. The host is the user-facing application — a desktop assistant, an IDE, the agent service you wrote; the client is the protocol connector embedded in the host, one client connection per server; the server is the capability provider — filesystem, database, GitHub, Slack — each wrapping its capabilities in a separate process, implementable by anyone in any language. In the demo, the host wires two client connections at startup and handshakes with a filesystem server and a database server. The key to the three roles is "the protocol lives between client and server": host and model never sense protocol details — to the model, an MCP tool is indistinguishable from a T01 in-process tool, just another line in the tool list, which is exactly why MCP slots into existing agent architectures smoothly. That is what "common socket" means: the plug shape is standardized, and appliances (tools) and power sources (applications) accommodate neither each other.

## Capability negotiation and the three capability classes

The handshake (initialize) is MCP's first act: client and server exchange protocol versions and capability lists — the server declares what it supports (the three classes: tools / resources / prompts), the client confirms which protocol versions it speaks. This act is one-time: capabilities are discovered at connection setup, and invocation happens on demand afterwards — discovery's cost is paid once, invocation's path walked a thousand times. The three classes divide the labor:

- tools are executable actions (query orders, write a file), invoked at the model's discretion.
- resources are readable data (documents, records), fetched at the application's discretion.
- prompts are pre-made prompt templates, chosen by the user.

In the demo, both servers report their lists and the host merges them into the tool list sent to the model — tool discovery is transparent to the model. Negotiation carries an engineering implication too: capability lists are dynamic — servers may add or drop tools at runtime, the host's tool list refreshes accordingly, and no application release is required.

## One protocol-mediated round trip

The demo's main line is a task spanning two servers: "find last quarter's order total and save the details to a file". The first half matches T01 exactly: merge tool lists and send to the model → the model returns a `tool_use` request. The second half diverges: instead of executing itself, the host forwards the request through the client to the owning server — the database server runs the query, the filesystem server writes the details to disk, and results travel back through the client to the host, then re-enter the model paired by `tool_use` id. Note there are two layers of "pairing": the model-side `tool_use`/`tool_result` pairing (T01's rules) and the protocol-side request/response pairing — two independent layers that do not interfere. What the protocol buys is freedom of execution location: tools can run in a local process, on another machine, in another organization's cloud, without the caller's code changing a line.

## Versus an ordinary tool call

Line up the similarities and differences. The same: everything on the model's side — tool lists, `tool_use` requests, `tool_result` replies, id pairing — MCP is fully transparent to the model, and that restraint is the protocol's design virtue: leave model interaction alone, change only the integration layer. The different: everything on the integration side — tools move from "in-process functions" to "cross-protocol services", gaining capability discovery, version negotiation, and lifecycle management (connection setup and teardown, reconnects on mid-session drops); error handling grows a layer too — protocol-level errors from the server (tool not found, invalid parameters, permission denied) must be translated by the client into `tool_result` error text the model can understand, and the translation must not lose actionable clues ([T03](/en/learn/t03-tool-failures/)'s lesson applies across layers). Latency also shifts: in-process calls are nanoseconds; protocol calls have network round trips, so a tool's latency budget (T01) needs recalibration in MCP scenarios. The security boundary moves too — servers are third-party code running outside the host. The criterion for needing MCP follows clearly: tools used only inside your own application are simpler as in-process functions; tools offered to many applications, or maintained by third parties, are where MCP's standardization starts paying.

## The security surface: least privilege

MCP's openness carries its own security proposition: servers are third-party code, and their capabilities often lead straight to sensitive resources — filesystems, databases, corporate messaging. Three bottom lines:

- One, grant capabilities minimally — open tools item by item as needed; the demo's host grants exactly query_orders and file-write, not "the whole database".
- Two, human gates in front — high-risk tools (write, delete, send) still wear [A06](/en/learn/a06-human-in-loop/)'s approval gate on top of MCP; the protocol does not do governance for you.
- Three, supply-chain scrutiny — installing a third-party server is importing a third-party dependency: audit the source and update channel, and issue server credentials under least privilege (a dedicated directory for a filesystem server, not the whole home directory).

MCP solves "how to connect", not "whether to connect" — the latter is always the application's governance problem.

## About the demo data

The server capability lists, the task, and the query result (East China Q2 order total ¥4,182,000) in the swim lane demo are illustrative teaching data, not real system output; the handshake, capability negotiation, and invocation round trip align with the official MCP specification and documentation.
