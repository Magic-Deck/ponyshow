/*
 * Ponyshow JS / CSS client library
 * To compile, run gulp
*/

var gulp = require('gulp'),
  fs = require('fs');

/*

  Gulp plugins

*/
var jshint = require('gulp-jshint'),
  concat = require('gulp-concat'),
  uglify = require('gulp-uglify'),
  rename = require('gulp-rename'),
  minifyCss = require("gulp-minify-css"),
  sourcemaps = require('gulp-sourcemaps'),
  header = require("gulp-header"),
  inject = require('gulp-inject'),
  clean = require('gulp-clean'),
  pkgJson = require('./package.json');


/*

  Default tasks

*/
gulp.task('default', []);