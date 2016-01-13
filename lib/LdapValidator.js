var ldap = require('ldapjs');
var LdapLookup = require('./LdapLookup');

var LdapValidator = module.exports = function(options){
  this._options = options;
  this._lookup = new LdapLookup(options);

  this._lookup._client.on('error', _reconnect);

  function _reconnect2(e){
      console.log("****reconnect2");
  }

  var self = this;
  function _reconnect(e) {
      console.log("RECONNECT", e);
      if (options.reconnect && e.code === 'ECONNRESET') {
          console.log("make a new one!");
          self._lookup = new LdapLookup(options);
          self._lookup._client.on('error', _reconnect);
      }else{
          console.log("dont sweat it the error was dumb")
      }

  }
};

LdapValidator.prototype.validate = function (username, password, callback) {
  if (!username) {
    return callback();
  }

  this._lookup._client.on('error', function(e){
      console.log("ERRRRR in validator client", e);
      return false;
  })
  //lookup by username
  this._lookup.search(username, function (err, up) {
    if(err) return callback(err);
    if(!up) return callback();

    // AD will bind and delay an error till later if no password is given
    if(password === '') return callback();

    var client = this._options.binder || ldap.createClient({ url: this._options.url, tlsOptions: this._options.tlsOptions });

    //try bind by password
    client.bind(up.dn, password, function(err) {
      if(err) return callback();
      callback(null, up);
    }.bind(this));
  }.bind(this));
};
