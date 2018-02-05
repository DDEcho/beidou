'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const debug = require('debug')('beidou-plugin:webpack');

module.exports = (app) => {
  const config = app.config;
  const router = config.router || {};

  const options = config.webpack;
  debug('current webpack plugin config: %j ', options);
  const defaultEntryName = options.defaultEntryName;
  const serveRoot = router.root || './';
  const exclude = router.exclude || '_*';
  const entryName = router.entry ? `${router.entry}.jsx` : defaultEntryName;
  const clientDir = config.client;
  const pageDir = path.join(clientDir, serveRoot);
  debug('resolve entry in dir: %s', pageDir);

  const hmr = options.hmr;
  const entry = {};
  let headEntries = [];
  const dev = app.config.env !== 'prod';
  if (hmr && dev) {
    const params = Object.keys(hmr)
      .map(key => `${key}=${hmr[key]}`)
      .join('&');
    const reactHotLoader = require.resolve('react-hot-loader/patch');
    const webpackHotMiddleware = require.resolve(
      'webpack-hot-middleware/client'
    );
    headEntries = [reactHotLoader, `${webpackHotMiddleware}?${params}`];
  }

  if (router.entry) {
    const filenames = [`${router.entry}.js`, `${router.entry}.jsx`];
    for (const filename of filenames) {
      entry.index = [
        ...headEntries,
        path.normalize(pageDir + path.sep + filename),
      ];
    }
  } else {
    const files = glob.sync('@(*.js|*.jsx)', {
      cwd: pageDir,
      ignore: exclude,
    });

    for (const file of files) {
      const filename = path.parse(file).name;
      entry[filename] = [
        ...headEntries,
        path.normalize(pageDir + path.sep + file),
      ];
    }
  }

  const dirs = glob.sync('*/', {
    cwd: pageDir,
    ignore: exclude,
  });

  for (const file of dirs) {
    const filename = path.parse(file).name;
    const entryFile = pageDir + file + entryName;
    if (fs.existsSync(entryFile)) {
      entry[filename] = [...headEntries, entryFile];
    }
  }

  debug('get entry file from %s : $j', pageDir, entry);

  return entry;
};
