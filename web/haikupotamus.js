export class Haikupotamus {
  constructor(host) {
    Haikupotamus.initGlobals();

    this.host = host;

    // Precache
    this.syllables = {
      'ARE':1,'AND':1,'HAIKU':2,'THE':1,
      'SYLLABLES':3, 'COUNTING':2,'WORDS':1,'FLOWING':2,'FROM':1,'YOUR':1,'FINGERS':2,
      'HAIKUPOTAMUS':5
    };
    this.guesses = {};
    this.sendQueue = [];
    this.requested = {};

    this.connect();

    this.elm = c({class : 'haiku', parent : document.body})
    this.input = c({class : 'input', type : 'textarea', parent : this.elm});
    this.input.setAttribute('cols', 40);
    this.input.setAttribute('spellcheck', false);
    this.input.setAttribute('maxlength', 255);
    this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.input.addEventListener('keyup', this.handleInputKey.bind(this));
    this.input.addEventListener('blur', this.handleInputBlur.bind(this));

    this.hippo = c({ class : 'hippo', parent : document.body});
    
    this.img = c({type : 'img', class : 'icopot', parent : this.hippo});
    this.img.src = 'icopotamus.png';
    this.img.setAttribute('alt', "a haikupotamus");
    this.img.addEventListener('click', this.handleImageClick.bind(this));

    this.hippoText = c({class : 'hippo-text', parent : this.hippo});
    this.hippoText.innerText = '';

    this.counts = c({class : 'counts', type : 'textarea', parent : this.elm});
    this.counts.cols = 1;

    if (window.location.hash)
      this.fromHash();
    else
      this.input.value = "counting syllables\nwords flowing from your fingers\nhaikupotamus";

    // this could get circular
    window.addEventListener('hashchange', this.handleHashChanged.bind(this));

    this.updateCounts();
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

  handleImageClick(e) {
    this.updateHash();
    navigator.clipboard.writeText(window.location);
    this.hippoText.innerText = '- Link copied to clipboard';

    if (this.clearHippoText) clearTimeout(this.clearHippoText)
    this.clearHippoText = setTimeout(() => {
      this.hippoText.innerText = '';
    }, 1800);
  }

  handleKeyDown(e) {
    if (e.keyCode == 13) {
      if ((this.input.value.match(/\n/g) || []).length >= 3) {
        e.preventDefault();
        return false;
      }
    }
  }

  updateHash() {
    var b64 = btoa(this.input.value).replace(/=+$/, "");
    window.history.pushState('', '', '/#' + b64 + '1');
  }

  handleHashChanged(e) {
    console.log("hash changed");
    this.fromHash();
  }

  fromHash() {
    var str = window.location.hash.substring(1);
    var v = str.substring(str.length - 1);
    
    try {
      switch (v) {
        case '1': // version 1
          this.input.value = atob(str.substring(0, str.length - 1));
          break;
      }
    } catch(e) {console.log(e);}
    this.updateCounts();
    this.fetchCounts();
  }

  handleInputKey(e) {
    // local lookup
    this.updateCounts();

    // delay population of local dictionary
    if (this.lookupDelay) clearTimeout(this.lookupDelay);
    this.lookupDelay = setTimeout(this.fetchCounts.bind(this), 400);

    this.updateHash();
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
    if (!word) return 0;

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
    if (s == 0) s = 1;
    this.guesses[word] = s;
    return s;
  }

  getSyllables(word) {
    word = this.standardizeWord(word);
    if (word in this.syllables) {
      if (typeof this.syllables[word] == "number")
        return this.syllables[word];
      else
        return this.syllables[word][0]; // TODO: handle multiple
    }
    return this.guessSyllables(word);
  }

  // standarizes the word - makes it ready for lookup, trims punctuation that
  // might confuse things.
  standardizeWord(word) {
    return word.toUpperCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
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
      var wraps = parseInt(lines[i].length / this.input.cols);
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
        word = this.standardizeWord(word);
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
    left:max(0px, calc(50% - 200px));
    top:max(0px, calc(50% - 100px));
    box-sizing: border-box;
    background-color:#090909;
    padding:5px;
  }
  textarea {
    padding-left:3px;
    box-sizing: border-box;
    background-color:#000;
    overflow:hidden;
    font-size:12px;
    color:#eee;
    border:0px;
    resize:none;
    font-family: 'Roboto Mono', 'Monaco', 'Consolas', monospace;
  }
  textarea:focus {
    border:0px;
    outline: none;
  }
  .counts {
    position:absolute;
    left:0px;
    top:0px;
    width:40px;
    height:150px;
    color:#555;
    white-space: pre-wrap;
    text-align: right;
  }
  .input {
    position:absolute;
    left:50px;
    top:0px;
    height:150px;
  }
  .hippo {
    position:absolute;
    left:max(50px, calc(50% - 150px));
    top:max(150px, calc(100% - 48px));
  }
  .icopot {
    position:absolute;
    opacity:0.5;
    width:32px;
    height:32px;
    cursor:pointer;
  }
  .icopot:hover {
    opacity:1;
  }
  .icopot:active {
    transform: scaleY(-1);
    cursor:none;
  }
  .icopot:hover + .hippo-text {
    display:block;
  }
  .hippo-text {
    display:none;
    position:absolute;
    opacity:0.75;
    overflow:hidden;
    width:200px;
    left:38px;
    top:6px;
  }
  `);
  Haikupotamus.inited = true;
}
