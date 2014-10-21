var fs = require('fs');
var path = require('path');


/*
 * Returns proper config file to handle githook attributes.
 */
var getConfig = function () {
  var config = module.config;

  if (config.githooks === undefined) {
    config.githooks = {};
  }

  return config;
};


var configHelpers = {

  /*
   * Add a key/value appName/secret to the githook config attribute.
   * @param githook The githook to create.
   * @param secret The githook secret.
   */
  addGithook: function (app, secret) {
    var config = getConfig();
    config.githooks[app] = secret;
    fs.writeFileSync(
      module.configPath, JSON.stringify(config, null, 2));
  },

  /*
   * Remove a key/value domain/appName to the domains config attribute.
   * @param domain The domain to unlink.
   */
  removeGithook: function (githook) {
    var config = getConfig();
    delete config.githooks[githook];
    fs.writeFileSync(
      module.configPath, JSON.stringify(config, null, 2));
  }
}



var commands = {
  /*
   * Add a key/value domain/appName to the domains attribute of the config
   * file.
   * @param domain The domain to link.
   * @param app The app to link to given domain.
   */
  addGithookToConfig: function (githook, app) {
    configHelpers.addGithook(githook, app);
    console.log(githook + ' configured.');
  },


  /*
   * Remove a key/value domain/appName to the domains attribute of the config
   * file.
   * @params domain The domain to unlink.
   */
  removeGithookFromConfig: function (githook) {
    configHelpers.removeGithook(githook);
    console.log(githook + ' removed from configuration.');
  }
};


module.exports = {

  // Add a route that allows to run given app installation again if it's a
  // static app
  configureAppServer: function(app, config, routes, callback) {
    var config = getConfig();
    var home = module.home;

    Object.keys(config.githooks).forEach(function (githook) {
      var manifest = config.apps[githook];
      var secret = config.githooks[githook];

      if (manifest !== undefined && manifest.type == "static") {
        hook = config.githooks[githook];

        app.post('/githooks/' + manifest.name, function (req, res, next) {
          signature = req.headers["X-Hub-Signature"];
          // TODO check secret,
          // signature = HMAC hex digest of the payload, using the hook’s
          // secret as the key (if configured).
          // https://developer.github.com/webhooks/
          module.npmHelpers.install(githook, function(err) {
            if (err) {
              console.log(err);
              next(err);
            } else {
              res.send({ success: true });
            };
          });
        });
      } else {
        res.send(404);
      };
    });
    callback();
  },

  // Set commands on the Cozy Light program.
  configure: function (options, config, program) {
    module.config = config;
    module.home = options.home;
    module.configPath = options.config_path;
    module.npmHelpers = options.npmHelpers;

    program
      .command('add-githook <app> <secret>')
      .description('Create a target url for the given githook.')
      .action(commands.addGithookToConfig);

    program
      .command('remove-githook <app>')
      .description('Remove githook for given app.')
      .action(commands.removeGithookFromConfig);
  }
};
