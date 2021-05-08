import { WSPipe } from './wspipe.mjs';

class Haikupotamus {
  constructor(port) {
    this.port = port;
    this.init();

    this.wordPopularity = {};
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

  handleMessage(conn, words) {
    try {
      words = JSON.parse(words);
    } catch(e) {
      console.log(e);
      return;
    }

    var res = {};

    words.forEach(word => {
      word = word.toUpperCase();
      this.wordPopularity[word] = this.wordPopularity[word] + 1;
      if (word in this.syllables)
        res[word] = this.syllables[word];
    });
    
    if (Object.keys(res).length > 0)
      conn.send(JSON.stringify(res));
  }
}

if (import.meta.main) {
  new Haikupotamus(8004);
}