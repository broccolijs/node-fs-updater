"use strict";

let fs = require("fs");
let path = require("path");
let rimraf = require("rimraf");
let fixturify = require("fixturify");
let outputWrapper = require("broccoli-output-wrapper");
let chai = require("chai"),
  expect = chai.expect;

let FSUpdater = require("./");

let Directory = FSUpdater.Directory;
let DirectoryIndex = FSUpdater.DirectoryIndex;
let File = FSUpdater.File;

describe("FSUpdater", () => {
  let file1Path;
  let file1Fixture = "file1 contents";
  let file2Path;
  let file2Fixture = "file2 contents";
  let dir1Path;
  // "a" and "b" are chosen to be the same as the DirectoryIndex entries we
  // generate below.
  let dir1Fixture = {
    a: "dir1/a contents",
    b: "dir1/b contents"
  };
  let dir2Path;
  let dir2Fixture = {
    b: "dir2/b contents"
  };
  let fixtures = {
    file1: file1Fixture,
    file2: file2Fixture,
    dir1: dir1Fixture,
    dir2: dir2Fixture
  };

  beforeEach(() => {
    rimraf.sync("tmp");
    fs.mkdirSync("tmp");
    fixturify.writeSync("tmp/fixtures", fixtures);
    file1Path = path.resolve("tmp/fixtures/file1");
    file2Path = path.resolve("tmp/fixtures/file2");
    dir1Path = path.resolve("tmp/fixtures/dir1");
    dir2Path = path.resolve("tmp/fixtures/dir2");
  });

  afterEach(() => {
    rimraf.sync("tmp");
  });

  describe("output path", () => {
    it("may be absent", () => {
      new FSUpdater("tmp/out");
      expect(fs.existsSync("tmp/out")).to.equal(false);
    });

    it("may be an empty directory", () => {
      fs.mkdirSync("tmp/out");
      new FSUpdater("tmp/out");
    });

    it("must not be a non-empty directory", () => {
      fs.mkdirSync("tmp/out");
      fs.writeFileSync("tmp/out/foo", "foo");
      expect(() => {
        new FSUpdater("tmp/out");
      }).to.throw();
    });

    it("must not be a file", () => {
      fs.writeFileSync("tmp/out", "foo");
      expect(() => {
        new FSUpdater("tmp/out");
      }).to.throw();
    });

    it("must not be a symlink", () => {
      fs.symlinkSync(".", "tmp/out");
      expect(() => {
        new FSUpdater("tmp/out");
      }).to.throw();
    });
  });

  describe("updates the output correctly", () => {
    // returns a list of [directoryIndex, expectedOutput] pairs
    function makeDirectoryIndices(aPairs, bPairs, APairs, BPairs) {
      let arr = [];
      for (let aPair of aPairs) {
        for (let bPair of bPairs) {
          for (let APair of APairs) {
            for (let BPair of BPairs) {
              let directoryIndex = new DirectoryIndex();
              let expectedOutput = {};
              if (aPair != null) {
                directoryIndex.set("a", aPair[0]);
                expectedOutput.a = aPair[1];
              }
              if (bPair != null) {
                directoryIndex.set("b", bPair[0]);
                expectedOutput.b = bPair[1];
              }
              if (APair != null) {
                directoryIndex.set("A", APair[0]);
                expectedOutput.A = APair[1];
              }
              if (BPair != null) {
                directoryIndex.set("B", BPair[0]);
                expectedOutput.B = BPair[1];
              }
              arr.push([directoryIndex, expectedOutput]);
            }
          }
        }
      }
      return arr;
    }

    let fsUpdater;

    function testUpdate(pairOld, pairNew, options) {
      // Deleting the outputPath is not currently supported.
      if (pairNew == null) return;
      // We use outparent as an intermediate directory because fixturify only
      // supports reading and writing directories, and tmp/outparent/out may
      // become a file.
      rimraf.sync("tmp/outparent");
      fs.mkdirSync("tmp/outparent");
      fsUpdater = new FSUpdater("tmp/outparent/out", options);
      if (pairOld != null) {
        // If pairOld is null, we test updating from scratch.
        fsUpdater.update(pairOld[0]);
      }
      fsUpdater.update(pairNew[0]);
      expect(fixturify.readSync("tmp/outparent")).to.deep.equal({
        out: pairNew[1]
      });
    }

    function testFixturesUnchanged() {
      // Verify that updating did not delete or change and files outside of the
      // output directory.
      expect(fixturify.readSync("tmp/fixtures")).to.deep.equal(fixtures);
    }

    let canSymlinkStates = [false, null];
    if (process.platform !== "win32") {
      canSymlinkStates.push(true);
    }
    canSymlinkStates.map(canSymlink => {
      describe(`with { canSymlink: ${canSymlink} }`, () => {
        let symlinkPairs,
          shortenedSymlinkPairs,
          directoryIndexPairs,
          shortenedDirectoryIndexPairs,
          lowerCaseNestedDirectoryIndexPairs,
          upperCaseNestedDirectoryIndexPairs,
          nestedPairsWithTwoEntries;

        beforeEach(() => {
          symlinkPairs = [
            [new File(file1Path), file1Fixture],
            [new File(file2Path), file2Fixture],
            [new Directory(dir1Path), dir1Fixture],
            [new Directory(dir2Path), dir2Fixture],
            null
          ];
          shortenedSymlinkPairs = [
            [new File(file1Path), file1Fixture],
            [new Directory(dir1Path), dir1Fixture],
            null
          ];
          directoryIndexPairs = makeDirectoryIndices(
            symlinkPairs,
            shortenedSymlinkPairs,
            [null],
            [null]
          );
          shortenedDirectoryIndexPairs = makeDirectoryIndices(
            symlinkPairs,
            [null],
            [null],
            [null]
          );
          lowerCaseNestedDirectoryIndexPairs = makeDirectoryIndices(
            symlinkPairs.concat(directoryIndexPairs),
            [null],
            [null],
            [null]
          );
          upperCaseNestedDirectoryIndexPairs = makeDirectoryIndices(
            [null],
            [null],
            symlinkPairs.concat(directoryIndexPairs),
            [null]
          );
          nestedPairsWithTwoEntries = symlinkPairs.concat(
            makeDirectoryIndices(symlinkPairs, symlinkPairs, [null], [null])
          );
        });

        it("updates the output correctly", () => {
          let oldPairs = nestedPairsWithTwoEntries.concat(
            lowerCaseNestedDirectoryIndexPairs
          );
          let newPairs = nestedPairsWithTwoEntries.concat(
            upperCaseNestedDirectoryIndexPairs
          );
          // console.log(oldPairs.length * newPairs.length);

          for (let oldPair of oldPairs) {
            for (let newPair of newPairs) {
              testUpdate(oldPair, newPair, {
                canSymlink: canSymlink,
                retry: false
              });
              testFixturesUnchanged();
            }
          }
        }).timeout(0);

        it("updates the output correctly with custom fs", () => {
          let oldPairs = nestedPairsWithTwoEntries.concat(
            lowerCaseNestedDirectoryIndexPairs
          );
          let newPairs = nestedPairsWithTwoEntries.concat(
            upperCaseNestedDirectoryIndexPairs
          );
          // console.log(oldPairs.length * newPairs.length);
          let customFS = outputWrapper({ outputPath: path.resolve('./') });
          for (let oldPair of oldPairs) {
            for (let newPair of newPairs) {
              testUpdate(oldPair, newPair, {
                canSymlink: canSymlink,
                retry: false,
                fs: customFS
              });
              testFixturesUnchanged();
            }
          }
        }).timeout(0);

        // When the user asks FSUpdater to create a state that is impossible,
        // such as a directory containing "a" and "A" on a case-sensitive file
        // system, it is allowed to fail, but it must not lose data. For
        // example, if we tried to create "a/foo" while "A" was a symlink to a
        // source directory, we might overwrite the file "foo" in the source
        // directory. The author believes that FSUpdater can never get into a
        // state where this can happen. This test attempts to verify that this
        // is the case, using the testFixturesUnchanged() function.
        it("does not lose data on impossible states, and recovers", () => {
          let oldFailingPairs = makeDirectoryIndices(
            symlinkPairs.concat(shortenedDirectoryIndexPairs),
            [null],
            symlinkPairs.concat(shortenedDirectoryIndexPairs),
            [null]
          );
          let newFailingPairs = oldFailingPairs;
          // console.log(oldFailingPairs.length * newFailingPairs.length);

          for (let oldPair of oldFailingPairs) {
            for (let newPair of newFailingPairs) {
              try {
                testUpdate(oldPair, newPair, {
                  canSymlink: canSymlink,
                  retry: true
                });
              } catch (e) {
                // Ignore errors.
              }
              testFixturesUnchanged();

              // Test that we recover from error states
              let knownGoodPair = symlinkPairs[0];
              fsUpdater.update(knownGoodPair[0], {
                canSymlink: canSymlink,
                retry: false
              });
              expect(fixturify.readSync("tmp/outparent")).to.deep.equal({
                out: knownGoodPair[1]
              });
              testFixturesUnchanged();
            }
          }
        }).timeout(0);
      });
    });
  });
});

require("mocha-eslint")("*.js");
