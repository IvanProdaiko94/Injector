'use strict';
const errors = require('./utils/errors');
const strategies = require('./utils/strategies');

/**
 *
 * @param moduleName {string}
 * @constructor
 */
function Injector(moduleName) {
  this.belongTo = moduleName;
  this.dependencies = new Map();
}

/**
 * @param dependencyName {String}
 * @return {*}
 */
Injector.prototype.resolve = function(dependencyName) {
  if (this.dependencies.has(dependencyName)) {
    return this.dependencies.get(dependencyName).resolver();
  }
  throw new ReferenceError(errors.unmetDependency(this.belongTo, dependencyName));
};

/**
 * @param dependencies {Map}
 */
Injector.prototype.addImports = function(dependencies) {
  dependencies.forEach((dependencyConfig, key) => {
    this.dependencies.set(key, dependencyConfig);
  });
};

/**
 * @param dependencies {Object<{name: string, strategy: string: value: any}>}
 * @return {Map}
 */
Injector.prototype.register = function(...dependencies) {
  dependencies.map(config => {
    const inject = config.value.$inject || [];
    const dConf = this.getConfigOf(config.name);
    if (dConf && dConf.strategy === 'constant') {
      throw new Error(errors.dependencyIsRegistered(config.name));
    } else if (!strategies.hasOwnProperty(config.strategy)) {
      throw new Error(errors.incorrectResolutionStrategy(config.strategy, strategies));
    } else if (inject.indexOf(config.name) !== -1) {
      throw new Error(errors.selfDependency(config.name));
    }
    inject.forEach(dep => {
      if (this.dependencies.has(dep)) {
        const depsToCheck = this.getConfigOf(dep).value.$inject || [];
        if (depsToCheck.indexOf(config.name) !== -1) {
          throw new Error(errors.circularDependency(config.name, dep));
        }
      }
    });
    config.resolver = strategies[config.strategy](config.name).bind(this);
    config.belongTo = this.belongTo;
    this.dependencies.set(config.name, config);
  });
};

/**
 * @param dependencyName {String}
 * @return {*}
 */
Injector.prototype.getConfigOf = function(dependencyName) {
  return this.dependencies.get(dependencyName);
};

module.exports = Injector;
