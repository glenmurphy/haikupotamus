const fileStr = await Deno.readTextFile("./cmudict-0.7b.txt");
var output = {};
fileStr.split("\n").forEach((line) => {
  var c = line.split(" ");
  var word = c[0].toUpperCase(); // objects have lowercase JS properties, eg constructor
  if (word == ';;;') return;

  var syllables = 0;
  for (var i = 1; i < c.length; i++) {
    if (c[i] && !isNaN(c[i].slice(-1))) {
      syllables++;
    }
  }

  if (word[word.length - 1] == ')') {
    word = word.split("(")[0];
  }

  if (output[word]) {
    if (typeof output[word] == "number") {
      if (output[word] != syllables)
        output[word] = [output[word], syllables];
      return;
    } else if (output[word].indexOf(syllables) == -1) {
      output[word].push(syllables);
    }
  } else {
    output[word] = syllables;
  }
    
});
Deno.writeTextFile("../server/syllables.json", JSON.stringify(output));