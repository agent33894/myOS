'use strict';
/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports */

const yaml = require('js-yaml');

/**
 * Custom gray-matter engines without the eval-based JavaScript engine.
 * Drop-in replacement for gray-matter/lib/engines.js.
 */

const engines = (module.exports = {});

engines.yaml = {
  parse: yaml.safeLoad.bind(yaml),
  stringify: yaml.safeDump.bind(yaml)
};

engines.json = {
  parse: JSON.parse.bind(JSON),
  stringify: function(obj, options) {
    const opts = Object.assign({replacer: null, space: 2}, options);
    return JSON.stringify(obj, opts.replacer, opts.space);
  }
};

engines.javascript = {
  parse: function parse() {
    throw new Error('JavaScript frontmatter is not supported. Use YAML or JSON.');
  },
  stringify: function() {
    throw new Error('Stringifying JavaScript is not supported.');
  }
};
