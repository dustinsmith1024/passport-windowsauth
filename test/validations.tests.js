var expect = require('chai').expect;
var Strategy = require('../lib/strategy');

describe('strategy', function() {
    it('should fail if integrated is false and ldap is null', function() {
        expect(function() {
            new Strategy({
                integrated: false
            }, function() {});
        }).to.throw(/ldap url should be provided in order to validate user and passwords/);
    });

    it('should NOT reconnect on ECONNRESET', function(done) {
        var strategy = new Strategy({
            ldap: {
                url: 'ldap://mydomain.com/',
                base: 'DC=wellscordobabank,DC=com',
                bindDN: 'AppUser',
                // reconnect: true, //default
                bindCredentials: 'APassword'
            }
        }, function() {});

        var err = new Error("Fake connection reset error");
        err.code = 'ECONNRESET';

        strategy._ldapLookup._client.on("_reconnect", function(e) {
            expect(false).to.equal(true, "It should not reconnect!");
            done();
        });

        strategy._ldapLookup._client.emit('error', err);

        setTimeout(function() {
            expect(true).to.be.ok;
            done();
        }, 100);
    });

    it('should reconnect on ECONNRESET', function(done) {
        var strategy = new Strategy({
            ldap: {
                url: 'ldap://mydomain.com/',
                base: 'DC=wellscordobabank,DC=com',
                bindDN: 'AppUser',
                reconnect: true,
                bindCredentials: 'APassword'
            }
        }, function() {});

        var err = new Error("Fake connection reset error");
        err.code = 'ECONNRESET';
        var count = 0;
        strategy._ldapLookup._client.on("_reconnect", function() {
            expect(true).to.be.ok;
            count++;
            if(count===2){
                    done();
            }else{
                strategy._ldapLookup._client.emit('error', err);
            }

        });

        strategy._ldapLookup._client.emit('error', err);
    });
});
