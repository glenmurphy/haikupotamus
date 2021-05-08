function c(opts) {
  var e = document.createElement(opts.type ? opts.type : 'div');
  if (opts.class) e.className = opts.class;
  if (opts.parent) opts.parent.appendChild(e);
  if (opts.innerHTML) e.innerHTML = opts.innerHTML;
  if (opts.innerText) e.innerText = opts.innerText;
  return e;
}

function appendStyle(style) {
  var sheet = document.createElement("style")
  sheet.innerText = style;
  document.head.appendChild(sheet);
}