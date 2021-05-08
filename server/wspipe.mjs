// WSPipe
// Partner (and API equivalent) to TCPPipe

import { serve } from "https://deno.land/std@0.95.0/http/server.ts";
import { acceptWebSocket, isWebSocketCloseEvent, } from "https://deno.land/std@0.95.0/ws/mod.ts";

// Makes a host socket have similar APIs to client sockets
class HostSocketWrapper {
  onmessage() {} // expected to be overridden
  onclose() {};  // expected to be overridden

  constructor(socket) {
    this.socket = socket;
    this.#handleSocket();
  }

  async #handleSocket() {
    // suppress console.error because the socket.close stuff will call
    // it if the socket doesn't exist when close happens
    //var a = console.error;
    //console.error = function() {};

    try {
      for await (const ev of this.socket) {
        if (typeof ev === "string") {
          this.onmessage(ev);
        } else if (isWebSocketCloseEvent(ev)) {
          this.onclose();
        }
      }
    } catch (err) {
      console.error(`failed to receive frame: ${err}`);

      if (!this.socket.isClosed) {
        await this.socket.close(1000);
      }
    }

    //console.error = a;
  }
  
  connect() {}
  send(text) {
    this.socket.send(text);
  }
  close() {
    this.socket.close();
  }
}

// Exists to make onmessage get text instead of event
class ClientSocketWrapper {
  onmessage() {};
  onclose() {};
  
  constructor(ws) {
    this.ws = ws;
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
  }
  send(text) {
    this.ws.send(text);
  }
  close() {
    this.ws.close();
  }
  handleMessage(msg) {
    this.onmessage(msg.data);
  }
  handleClose() {
    this.onclose();
  }
}

class WSHost {
  constructor(config) {
    this.#serve(config);
    this.onconnect = config.onconnect;
    this.onmessage = config.onmessage;
  }

  async #serve(address) {
    this.host = serve(`:${address.port}`)
    for await (const req of this.host) {
      const { conn, r: bufReader, w: bufWriter, headers } = req;
      acceptWebSocket({ conn, bufReader, bufWriter, headers, })
        .then(this.#acceptWebSocket.bind(this))
        .catch(async (err) => {
          console.error(`failed to accept websocket: ${err}`);
          await req.respond({ status: 400 });
        });
    }
  }

  #acceptWebSocket(hostWS) {
    var hs = new HostSocketWrapper(hostWS);
    if (this.onmessage)
      hs.onmessage = this.onmessage;

    if (this.onconnect)
      this.onconnect(hs);
  }

  close() {
    this.host.close();
  }
}

export class WSPipe {
  static async Client(address) {
    return new Promise((resolve, reject) => {
      var ws = new WebSocket(`ws://${address.hostname}:${address.port}`);
      ws.onopen = function() {
        var cs = new ClientSocketWrapper(ws);
        resolve(cs);
      };
    });
  }

  static Host(config) {
    return new WSHost(config);
  }

  static async SendMessage(address, message) {
    var c = await WSPipe.Client(address);
    await c.send(message);
    c.close();
  }
}