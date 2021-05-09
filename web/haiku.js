export class Haiku {
  poem = '';
  syllables = {};

  constructor(data) {
    if (!data) return;
    if (data['poem']) this.poem = data.poem;
    if (data['syllables']) this.syllables = data.syllables;
  }

  toData() {
    return {
      data : this.data,
      syllables : this.syllables
    }
  }

  toJSONString() {
    return JSON.stringify(this.toData())
  }

  toFragment() {
    return btoa(this.poem) + '1'; // version 1
  }

  fromFragment(str) {
    var v = str.substring(str.length - 1);
    switch (v) {
      case '1': // version 1
        this.poem = atob(str.substring(0, str.length - 1))
        break;
    }
  }
}