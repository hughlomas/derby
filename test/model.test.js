var wrapTest = require('./helpers').wrapTest,
    assert = require('assert'),
    _ = require('../lib/utils'),
    model = require('../lib/model.js');

function makeModel(environment) {
  _.onServer = environment === 'server';
  return model();
}

module.exports = {
  'test model set and get simple objects': function() {
    var model = makeModel('browser'),
        page = {
          name: 'test',
          lines: ['line1', 'line 2', 'more lines...'],
          length: 3
        };
    model.set('files.doc.page', page);
    model.get('files.doc.page').should.eql(page);
    model.get().should.eql({ files: { doc: { page: page } } });
    model.get('files.doc.page.name').should.eql(page.name);
    model.get('files.doc.page.lines').should.eql(page.lines);
    model.get('files.doc.page.lines.1').should.eql('line 2');
    model.set('files.info', { more: 'stuff' });
    model.set('files.doc.page.name', 34);
    page.name = 34;
    model.get().should.eql({
      files: {
        doc: { page: page },
        info: { more: 'stuff' }
      }
    });
  },
  'test model init data': function() {
    var model = makeModel('server'),
        obj = {
          files: {
            doc: {
              num: 3,
              arr: [2, 3, 4]
            }
          }
        };
    model.init(obj);
    model.get().should.eql(obj);
    model.get('files.doc.num').should.eql(3);
  },
  'test model set and get references': function() {
    var model = makeModel('server');
    model.init({
      info: {
        users: [
          // References can be direct links to another object in the model
          { name: 'user1', color: model.ref('info.favoriteColors') },
          { name: 'ben', color: 'purple' }
        ],
        favoriteColors: ['aqua', 'orange']
      },
      userIndex: 1,
      // They can also take a second argument for another model object that
      // acts as a key on the referenced object
      user: model.ref('info.users', 'userIndex')
    });
    // References can be used with getters and setters
    model.get('user.name').should.equal('ben');
    model.set('user.color', 'green');
    model.get('info.users.1.color').should.equal('green');
    // Update the reference key
    model.set('userIndex', 0);
    model.get('user.color.0').should.equal('aqua');
    // It is possible to modify properties on the referenced object. However, if
    // the item that is currently set to a reference is set to something else,
    // the new value replaces the reference and the originally referenced object
    // remains unmodified.
    model.set('user.color.1', 'pink');
    model.set('user.color', 'red');
    model.get('user.color').should.equal('red');
    model.get('info.favoriteColors').should.eql(['aqua', 'pink']);
  },
  'test model set and get model functions': function() {
    var model = makeModel('server');
    model.init({
      item: {
        val: model.func('add'),
        arg1: 11
      },
      arg2: 7
    });
    model.makeFunc('add', ['item.arg1', 'arg2'], function(arg1, arg2) {
      return arg1 + arg2;
    });
    model.get('item.val').should.equal(18);
    model.set('item.arg1', 21);
    model.get('item.val').should.equal(28);
    model.set('arg2', 0);
    model.get('item.val').should.equal(21);
  },
  'test model trigger successful event on set': wrapTest(function(done) {
    var model = makeModel('browser'),
        domMock = {
          update: function(id, method, property, viewFunc, value) {
            id.should.equal('test');
            method.should.equal('attr');
            property.should.equal('height');
            assert.isUndefined(viewFunc);
            value.should.equal(11);
            done();
          }
        };
    model._link(domMock);
    model.init({ picHeight: 14 });
    model.events.bind('picHeight', ['test', 'attr', 'height']);
    model.set('picHeight', 11);
    model.set('picHeight', 11);
  }, 2),
  'test model trigger unsuccessful event on set': wrapTest(function(done) {
    var model = makeModel('browser'),
        domMock = {
          update: function() {
            done();
            return false;
          }
        };
    model._link(domMock);
    model.init({ picHeight: 14 });
    model.events.bind('picHeight', ['test', 'attr', 'height']);
    model.set('picHeight', 11);
    model.set('picHeight', 11);
  }, 1),
  'test model trigger event on reference set': wrapTest(function(done) {
    var model = makeModel('browser'),
        expectedColor,
        domMock = {
          update: function(id, method, property, viewFunc, value) {
            id.should.equal('test');
            method.should.equal('prop');
            property.should.eql(['style', 'color']);
            assert.isUndefined(viewFunc);
            value.should.equal(expectedColor);
            done();
          }
        };
    model._link(domMock);
    model.init({
      info: {
        users: [
          { name: 'user1', colors: model.ref('info.favoriteColors') },
          { name: 'ben', colors: ['black', 'white'] }
        ],
        favoriteColors: ['aqua', 'orange']
      },
      userIndex: 0,
      user: model.ref('info.users', 'userIndex')
    });
    model.events.bind('user.colors.1', ['test', 'prop', ['style', 'color']]);
    expectedColor = 'violet';
    model.set('user.colors.1', expectedColor);
    console.log(model.events._names)
    expectedColor = 'white';
    model.set('userIndex', 1);
    console.log(model.events._names)
    //model.set('info.users.1.color.1', 'violet');
  }, 2),
  'test model push': wrapTest(function(done) {
    var model = makeModel('browser'),
        domMock = {
          update: function(id, method, property, viewFunc, value) {
            id.should.equal('list');
            method.should.equal('appendHtml');
            assert.isNull(property);
            viewFunc.should.equal('stuff');
            value.should.equal('hey');
            done();
          }
        };
    model._link(domMock);
    model.init({
      stuff: {
        items: ['item1', [8, 3, 'q'], 'item3']
      }
    });
    model.events.bind('stuff.items', ['list', 'html', null, 'stuff']);
    model.push('stuff.items', 'hey');
    model.get('stuff.items').should.eql(['item1', [8, 3, 'q'], 'item3', 'hey']);
  }, 1)
}