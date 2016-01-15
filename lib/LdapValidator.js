var ldap = require('ldapjs');
var LdapLookup = require('./LdapLookup');

var LdapValidator = module.exports = function(options){
  this._options = options;
  this._lookup = new LdapLookup(options);
};

LdapValidator.prototype.validate = function (username, password, callback) {
  if (!username) {
    return callback();
  }

  //lookup by username
  this._lookup.search(username, function (err, up) {
    if(err) return callback(err);
    if(!up) return callback();

    // AD will bind and delay an error till later if no password is given
    if(password === '') return callback();

    var client = this._options.binder || ldap.createClient({ url: this._options.url, tlsOptions: this._options.tlsOptions });

    // looks like this client is the one that needs the handler
    // not what we need anything else that was done...
    client.on('error', function(e){
        console.log("e in validate", e);
        var err = new Error().stack;
        console.log("stack from validate:", err);
    })
    //try bind by password
    client.bind(up.dn, password, function(err) {
      if(err) {
          console.log("ERR in bind in validate", err);
          return callback();
      }
      callback(null, up);
    }.bind(this));
  }.bind(this));
};
