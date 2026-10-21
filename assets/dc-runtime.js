/* ListEm prototype – tiny template runtime (renders the page templates with React) */
(function () {
  var h = React.createElement;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var EVENTS = { onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', onsubmit: 'onSubmit', onkeydown: 'onKeyDown', onblur: 'onBlur', onfocus: 'onFocus', onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave' };
  var RENAME = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', inputmode: 'inputMode', readonly: 'readOnly', maxlength: 'maxLength', autocomplete: 'autoComplete', colspan: 'colSpan', rowspan: 'rowSpan' };

  function lookup(expr, scopes) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (/^'.*'$|^".*"$/.test(expr)) return expr.slice(1, -1);
    var parts = expr.split('.');
    var base;
    for (var i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i] && Object.prototype.hasOwnProperty.call(scopes[i], parts[0])) { base = scopes[i][parts[0]]; break; }
    }
    for (var j = 1; j < parts.length; j++) { if (base == null) return undefined; base = base[parts[j]]; }
    return base;
  }
  function interp(str, scopes) {
    return str.replace(HOLE, function (m, e) { var v = lookup(e, scopes); return v == null ? '' : String(v); });
  }
  function attrVal(str, scopes) {
    var m = str.match(WHOLE);
    return m ? lookup(m[1], scopes) : interp(str, scopes);
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); }); }
  function parseStyle(css) {
    var out = {};
    css.split(';').forEach(function (decl) {
      var i = decl.indexOf(':');
      if (i < 0) return;
      var k = decl.slice(0, i).trim();
      var v = decl.slice(i + 1).trim();
      if (!k) return;
      out[k.indexOf('--') === 0 ? k : camel(k)] = v;
    });
    return out;
  }
  function propsFor(el, scopes, key) {
    var p = { key: key };
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      var name = a.name;
      if (name.indexOf('hint-') === 0) continue;
      var v = attrVal(a.value, scopes);
      var lower = name.toLowerCase();
      if (EVENTS[lower]) { if (typeof v === 'function') p[EVENTS[lower]] = v; continue; }
      if (name === 'style') { p.style = parseStyle(String(v)); continue; }
      if (RENAME[name]) name = RENAME[name];
      else if (name.indexOf('aria-') !== 0 && name.indexOf('data-') !== 0 && name.indexOf('-') > 0) name = camel(name);
      if (name === 'value' && v == null) v = '';
      p[name] = v;
    }
    return p;
  }
  function renderNodes(nodes, scopes, prefix) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var key = prefix + '.' + i;
      if (n.nodeType === 3) {
        var txt = n.nodeValue;
        if (/^\s*$/.test(txt) && txt.indexOf('\n') !== -1) continue;
        out.push(interp(txt, scopes));
      } else if (n.nodeType === 1) {
        var tag = n.localName;
        if (tag === 'template') {
          var kind = n.getAttribute('data-k');
          if (kind === 'if') {
            if (attrVal(n.getAttribute('value') || '', scopes)) out.push(h(React.Fragment, { key: key }, renderNodes(n.content.childNodes, scopes, key)));
          } else if (kind === 'for') {
            var list = attrVal(n.getAttribute('list') || '', scopes) || [];
            var as = n.getAttribute('as') || 'item';
            for (var j = 0; j < list.length; j++) {
              var sc = { $index: j }; sc[as] = list[j];
              out.push(h(React.Fragment, { key: key + '#' + j }, renderNodes(n.content.childNodes, scopes.concat([sc]), key + '#' + j)));
            }
          }
        } else {
          var kids = renderNodes(n.childNodes, scopes, key);
          out.push(h.apply(null, [tag, propsFor(n, scopes, key)].concat(kids.length ? [kids] : [])));
        }
      }
    }
    return out;
  }

  var tree = null;
  function DCLogic(props) { React.Component.call(this, props); }
  DCLogic.prototype = Object.create(React.Component.prototype);
  DCLogic.prototype.constructor = DCLogic;
  Object.setPrototypeOf(DCLogic, React.Component);
  DCLogic.prototype.render = function () {
    var vals = this.renderVals ? this.renderVals() : {};
    return h(React.Fragment, null, renderNodes(tree.childNodes, [vals], 'r'));
  };
  window.DCLogic = DCLogic;
  window.DC = {
    mount: function (Component) {
      tree = document.getElementById('tpl').content;
      ReactDOM.createRoot(document.getElementById('root')).render(h(Component, {}));
    }
  };
})();
