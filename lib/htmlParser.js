// Modified from HTML Parser By John Resig (ejohn.org)
// http://ejohn.org/blog/pure-javascript-html-parser/
// Original code by Erik Arvidsson, Mozilla Public License
// http://erik.eae.net/simplehtmlparser/simplehtmlparser.js

// Regular Expressions for parsing
var startTag = /^<(\w+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
    endTag = /^<\/(\w+)[^>]*>/,
    attr = /(\w+)(?:\s*(=)\s*(?:(?:([^>\s]+)|"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')))?/g,
    comment = /<!--[\s\S]*?-->(?:\n *)?/g;

var parse = exports.parse = function(html, handler) {
  var empty = function() {},
      charsHandler = (handler && handler.chars) || empty,
      startHandler = (handler && handler.start) || empty,
      endHandler = (handler && handler.end) || empty,
      last, index, chars, match;
  
  function parseStartTag(tag, tagName, rest) {
    var attrs = {};
    rest.replace(attr, function(match, name, equals, attr0, attr1, attr2) {
      if (equals) {
        attrs[name] =
          attr0 ? attr0 :
          attr1 ? attr1 :
          attr2 ? attr2 : '';
      } else {
        attrs[name] = null;
      }
    });
    startHandler(tagName, attrs);
  }

  function parseEndTag(tag, tagName) {
    endHandler(tagName);
  }
  
  // Remove all comments
  html = html.replace(comment, '');
  
  while (html) {
    last = html;
    chars = true;
    
    // Check for start of a tag
    if (html[0] === '<') {
      
      // Check if it is a closing tag
      if (html[1] === '/') {
        match = html.match(endTag);
        if (match) {
          html = html.substring(match[0].length);
          match[0].replace(endTag, parseEndTag);
          chars = false;
        }
      
      // Otherwise it is an opening tag
      } else {
        match = html.match(startTag);
        if (match) {
          html = html.substring(match[0].length);
          match[0].replace(startTag, parseStartTag);
          chars = false;
        }
      }
      
    }

    if (chars) {
      index = html.indexOf('<');
      var text = index < 0 ? html : html.substring(0, index);
      html = index < 0 ? '' : html.substring(index);
      charsHandler(text);
    }

    if (html === last) {
      throw 'Parse Error: ' + html;
    }
  }
};