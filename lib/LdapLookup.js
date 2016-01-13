var ldap = require('ldapjs');

var LdapLookup = module.exports = function(options){
  var self = this;
  this._options = options;
  console.log("CONNNECT")
  this._search_query = options.search_query ||
    '(&(objectclass=user)(|(sAMAccountName={0})(UserPrincipalName={0})))';

  this._client = options.client ? options.client : _createClient(options);

  this._client.on('error', _error2);
  function _error2(e){
      console.log("the lookup error", e);
  }

  function _error(e) {
    console.log('LDAP connection error:', e.code);
    if (self._options.reconnect && e.code === 'ECONNRESET'){
        console.log("go reconnect!!")
        self._client.emit("_reconnect");
        self._client.unbind();

        self._client = self._options.client ? self._options.client : _createClient(self._options);
        _bind(self);
        // testing after setting this if this is needed...
        self._client.on('error', _error);
    }else{
        console.log("SOME OTHER ERR", e);
    }
  }

  function _createClient(opts){
      return ldap.createClient({
        url:            opts.url,
        maxConnections: 10,
        bindDN:         opts.bindDN,
        credentials:    opts.bindCredentials,
        tlsOptions:     opts.tlsOptions
      });
  }

  function _bind(lookup){
      if (options.client) {
        console.log("already connected!")
        lookup.clientConnected = true;
        return lookup;
      }
      console.log('[_bind it up]', lookup)
      lookup._queue = [];
      lookup._client.bind(options.bindDN, options.bindCredentials, function(err) {
        if(err){
            return console.log("Error binding to LDAP", 'dn: ' + err.dn + '\n code: ' + err.code + '\n message: ' + err.message);
        }
        lookup.clientConnected = true;
        lookup._queue.forEach(function (cb) { cb(); });
      });
      return lookup;
  }

  self = _bind(this);
  // test this a couple more times, then save it and tryout just reconnecting in the Validator file.
};

LdapLookup.prototype.search = function (username, callback) {
  var self = this;
  function exec(){
    var opts = {
      scope: 'sub',
      filter: self._search_query.replace(/\{0\}/ig, username)
    };
    self._client.search(self._options.base, opts, function(err, res){
      var entries = [];
      res.on('searchEntry', function(entry) {
        entries.push(entry);
      });
      res.on('error', function(err) {
        callback(err);
      });
      res.on('end', function() {
        if(entries.length === 0) return callback(null, null);
        callback(null, entries[0].object);
      });
    });
  }

  if(this.clientConnected){
    exec();
  } else {
    this._queue.push(exec);
  }
};
