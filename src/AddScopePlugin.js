function addIndexScope(libraryId, fileContent, locale) {
  return `
(function(win) {
  function CooshuScope() {
    window.top.cooshuHelper.cloneWindow(win, this);
  }
  CooshuScope.prototype.init = function() {
    var window = this;
    var locale = ${locale}
    var module;
    ${fileContent}
    window.top.cooshuHelper.libraryRegisterFromJsFile(window.library, locale, '${libraryId}', 'index', document.currentScript.src);
  };
  new CooshuScope().init();
})(window);`;
}

class AddScopePlugin {
  constructor(config) {
    this.config = config;
  }

  // noinspection JSUnusedGlobalSymbols
  apply(compiler) {
    const _this = this;
    // noinspection JSUnresolvedFunction
    compiler.plugin('emit', function(compilation, callback) {
      const { assets, chunks } = compilation;

      Object.keys(assets).forEach(filename => {
        const chunk = chunks.find(a => a.files.find(b => b === filename));
        const chunkName = chunk.name || chunk.id;
        const config = _this.config && _this.config[chunkName];
        if (!config) {
          throw `cannot file config with "${chunkName}" entry`;
        }

        const locale = config.locale;
        delete config.locale;
        const configFileName = filename.replace(/index.js$/, 'config.json');
        const configContent = JSON.stringify(config, function(key, val) {
          if (typeof val === 'function') {
            return val + '';
          }
          return val;
        });
        config.locale = locale;

        assets[configFileName] = {
          source() {
            return configContent;
          },
          size() {
            return configContent.length;
          },
        };

        const fileContent = assets[filename].source();
        const formatFileContent = addIndexScope(config.libraryId, fileContent, JSON.stringify(locale));

        assets[filename] = {
          source() {
            return formatFileContent;
          },
          size() {
            return formatFileContent.length;
          },
        };
      });

      callback();
    });
  }
}

// noinspection JSUnresolvedVariable
module.exports = AddScopePlugin;
