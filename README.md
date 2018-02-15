# node-fs-updater

[![Build Status](https://travis-ci.org/broccolijs/node-fs-updater.svg?branch=master)](https://travis-ci.org/broccolijs/node-fs-updater)
[![Build status](https://ci.appveyor.com/api/projects/status/5sb039bjee4q3obw?svg=true)](https://ci.appveyor.com/project/joliss/node-fs-updater)


Repeatedly write an in-memory directory tree to disk, with incremental updating.

## Installation

This package requires Node version 6.0.0 or newer.

```bash
npm install --save fs-updater
```

## Usage

```js
let FSUpdater = require("fs-updater");
```

* `FSUpdater`: An object used to repeatedly update an output directory.

  * `new FSUpdater(outputPath, options)`: Create a new `FSUpdater` object. The
    `outputPath` must be an empty directory or absent.

    It is important that the `FSUpdater` has exclusive access to the
    `outputPath` directory. `FSUpdater.prototype.update` calls
    [rimraf](https://github.com/isaacs/rimraf), which can be dangerous in the
    presence of symlinks if unexpected changes have been made to the
    `outputPath` directory.

    `options.canSymlink` (boolean): If true, use symlinks; if false, copy
    files and use junctions. If `null` (default), auto-detect.

  * `FSUpdater.prototype.update(directory)`: Update the `outputPath` directory
    to mirror the contents of the `directory` object, which is either a
    `DirectoryIndex` (an in-memory directory) or a `Directory` (a directory on
    disk).

    **Important note:** You may re-use `File` objects contained in the
    `DirectoryIndex` between repeated calls to `.update()` only if the file
    contents have not changed. Similarly, you may re-use `DirectoryIndex` and
    `Directory` objects only if no changes have been made to the directory or
    any files or subdirectories recursively, including those reachable through
    symlinks.

* `FSUpdater.DirectoryIndex`: A subclass of
  [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
  representing an in-memory directory; see the documentation there.

  `DirectoryIndex` objects map file names (`string` primitives, without paths)
  to `DirectoryIndex`, `Directory` or `File` objects.

* `FSUpdater.Directory`: A directory on disk. Think of this as an in-memory
  symlink to a directory.

  * `new Directory(path)`: Create a new `Directory` object pointing to
    the directory at `path`.

  * `Directory.prototype.valueOf()`: Return the `path`.

  * `Directory.prototype.getIndexSync()`: Read the physical directory and return a
    `DirectoryIndex`. The `DirectoryIndex` object is cached between repeated
    calls to `getIndexSync()`.

* `FSUpdater.File`: Represents a file on disk. Think of this as an in-memory
  symlink.

  * `new File(path)`: Create a new `File` object pointing to the file at `path`.

  * `File.prototype.valueOf()`: Return the `path`.

* `FSUpdater.makeFSObject(path)`: Return a `File` or `Directory` object,
  depending on the file type on disk. This function follows symlinks.

## Contributing

Clone this repo and run the tests like so:

```
npm install
npm test
```

Issues and pull requests are welcome. If you change code, be sure to re-run
`npm test`. Oftentimes it's useful to add or update tests as well.
