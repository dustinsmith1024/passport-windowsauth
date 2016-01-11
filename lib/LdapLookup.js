var ldap = require('ldapjs');

var LdapLookup = module.exports = function(options){
  var self = this;
  this._options = options;
  console.log("CONNNECT")
  this._search_query = options.search_query ||
    '(&(objectclass=user)(|(sAMAccountName={0})(UserPrincipalName={0})))';

  this._client = options.client ? options.client : ldap.createClient({
    url:            options.url,
    maxConnections: 10,
    bindDN:         options.bindDN,
    credentials:    options.bindCredentials,
    tlsOptions:     options.tlsOptions
  });

  this._client.on('error', function(e){
    console.log("LDAP ERRRRRR", self._options.reconnect);
    console.log('LDAP connection error:', e, e.code);
    if (self._options.reconnect && e.code === 'ECONNRESET'){
        console.log("go unbind!")
        self._client.unbind();

        self._client = self._options.client ? self._options.client : ldap.createClient({
          url:            self._options.url,
          maxConnections: 10,
          bindDN:         self._options.bindDN,
          credentials:    self._options.bindCredentials,
          tlsOptions:     self._options.tlsOptions
        });

        _bind(self);
    }
  });

  if (options.client) {
    this.clientConnected = true;
    return;
  }

  function _bind(lookup){
      console.log('[_bind]', lookup)
      lookup._queue = [];
      lookup._client.bind(options.bindDN, options.bindCredentials, function(err) {
        if(err){
            return console.log("Error binding to LDAP", 'dn: ' + err.dn + '\n code: ' + err.code + '\n message: ' + err.message);
        }
        lookup.clientConnected = true;
        lookup._queue.forEach(function (cb) { cb(); });
      });
  }

  _bind(this);
  console.log(this._options.client);
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
