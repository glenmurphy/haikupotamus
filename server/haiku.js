import { WSPipe } from './wspipe.mjs';

class Haiku {
  constructor(port) {
    this.port = port;
    this.init();
  }

  async init() {
    const fileStr = await Deno.readTextFile("./syllables.json");
    this.syllables = JSON.parse(fileStr);

    var pipe = WSPipe.Host({ port : this.port });
    pipe.onconnect = this.handleConnect.bind(this);
  }

  handleConnect(conn) {
    conn.onmessage = this.handleMessage.bind(this, conn);
  }

  handleMessage(conn, word) {
    word = word.toUpperCase();
    var res = {};
    res[word] = this.syllables[word];
    conn.send(JSON.stringify(res));
  }
}

if (import.meta.main) {
  new Haiku(8004);
}