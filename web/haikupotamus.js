export class Haikupotamus {
  constructor(host) {
    Haikupotamus.initGlobals();

    this.host = host;
    this.syllables = {
      'HAIKUPOTAMUS'  : 5
    };
    this.guesses = {};

    this.connect();

    this.elm = c({class : 'haiku', parent : document.body})
    this.input = c({class : 'input', type : 'textarea', parent : this.elm});
    this.input.value = "syllables counted\nwords flowing across the page\nhaikupotamus"
    this.input.setAttribute('cols', 60);
    this.input.addEventListener('keyup', this.handleInputKey.bind(this));
    this.input.addEventListener('blur', this.handleInputBlur.bind(this));

    this.counts = c({class : 'counts', type : 'textarea', parent : this.elm});
    this.sendQueue = [];
    this.requested = {};
    this.fetchCounts();
  }

  connect() {
    this.wssc = new WebSocket(this.host);
    this.wssc.addEventListener("message", this.handleMessage.bind(this));
    this.wssc.addEventListener("open", this.handleOpen.bind(this));
    this.wssc.addEventListener("close", this.handleClose.bind(this));
  }

  handleOpen() {
    this.input.focus();
    
    var queue = [...this.sendQueue];
    this.sendQueue = [];
    queue.forEach((str) => {
      this.send(str);
    });
  }

  handleClose() {
    this.connect();
  }

  keepAlive() {
    this.send("{}");
  }

  send(str) {
    if (this.wssc && this.wssc.readyState == WebSocket.OPEN)
      this.wssc.send(str);
    else 
      this.sendQueue.push(str);
  }

  handleInputBlur(e) {
    this.input.focus();
  }

  handleInputKey(e) {
    // local lookup
    this.updateCounts();

    // delay population of local dictionary
    if (this.lookupDelay)
      clearTimeout(this.lookupDelay);
    this.lookupDelay = setTimeout(this.fetchCounts.bind(this), 400);
  }

  requestWords(words) {
    this.send(JSON.stringify(words));
  }

  // This is naive - it assumes vowel blocks are indicators of syllables
  // you can see how this breaks down with words like 'aria' vs 'are'
  vowels = ['A', 'E', 'I', 'O', 'U', 'Y'];
  guessSyllables(word) {
    if (word in this.guesses)
      return this.guesses[word];
  
    var inVowel = false;
    var s = 0;
    for(var i = 0; i < word.length; i++) {
      if (this.vowels.includes(word[i])) {
        s += inVowel ? 0 : 1; 
        inVowel = true;
      } else {
        inVowel = false;
      }
    }
    this.guesses[word] = s;
    return s;
  }

  getSyllables(word) {
    word = word.toUpperCase();
    if (word in this.syllables) {
      if (typeof this.syllables[word] == "number")
        return this.syllables[word];
      else
        return this.syllables[word][0]; // TODO: handle multiple
    }
    return this.guessSyllables(word);
  }

  updateCounts() {
    var lines = this.input.value.split("\n");
    this.counts.value = '';
    for (var i = 0; i < lines.length; i++) {
      var s = 0;
      lines[i].split(" ").forEach(word => {
        s += this.getSyllables(word);
      })
      s = (s == 0) ? '' : s;
      this.counts.value += s + "\n";

      // Handle line wrapping (exceeded textarea cols)
      var wraps = parseInt(lines[i].length / 60);
      for (var u = 0; u < wraps; u++) {
        this.counts.value += "\n";
      }
    }
  }

  fetchCounts() {
    var lines = this.input.value.split("\n");
    var req = [];

    for (var i = 0; i < lines.length; i++) {
      lines[i].split(" ").forEach(word => {
        word = word.toUpperCase();
        if (!(word in this.syllables) && !(word in this.requested)) {
          req.push(word);
          this.requested[word] = true;
        }
      })
    }

    if (req.length)
      this.requestWords(req);
  }

  getTime() {
    return (Date.now() / 1000) + this.serverTimeOffset;
  }

  handleMessage(e) {
    try {
      var res = JSON.parse(e.data);
    } catch(e) { console.log(e); }
    console.log(res);
    for (var key in res) {
      this.syllables[key] = res[key];
    }
    this.updateCounts();
  }
}

Haikupotamus.inited = false;
Haikupotamus.initGlobals = function() {
  if (Haikupotamus.inited) return;

  appendStyle(`
  .haiku {
    position:absolute;
    left:50%;
    top:50%;
    margin-left:-200px;
    margin-top:-100px;
    box-sizing: border-box;
    background-color:#090909;
    padding:5px;
  }
  textarea {
    padding-left:3px;
    box-sizing: border-box;
    background-color:#000;
    font-size:12px;
    color:#ff7;
    border:0px;
    resize:none;
    font-family: 'Monaco', 'Consolas', 'Inconsolata', monospace;
  }
  textarea:focus {
    border:0px;
    outline: none;
  }
  .counts {
    position:absolute;
    left:0px;
    top:0px;
    width:45px;
    height:200px;
    color:#993;

    text-align: right;
    white-space: normal;
  }
  .input {
    position:absolute;
    left:50px;
    top:0px;
    height:200px;
  }
  `);
  Haikupotamus.inited = true;
}
