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
  clean = require('gulp-clean');

var getCopyright = function () {
  return fs.readFileSync('Copyright');
};
var getVersion = function () {
    return fs.readFileSync('Version');
};

gulp.task('clean-html', function () {
  return gulp.src('workspace/*.html', {read: false})
    .pipe(clean());
});


/*

  CSS minify

*/
gulp.task('minify-css', function () {
  gulp.src(['src/css/prism.css'])
    .pipe(sourcemaps.init())
    .pipe(minifyCss({keepBreaks:false}))
    .pipe(concat('main.css'))
    .pipe(gulp.dest('workspace/css'));
});

/*

  Concatenate & Minify JS

*/
gulp.task('scripts', function() {
  return gulp.src(['src/js/app.js','src/js/app.shower.js','src/js/canvas2image.js','src/js/html2canvas.js','src/js/prism.js'])
    .pipe(concat('main.js'))
    .pipe(gulp.dest('workspace/js'))
    .pipe(uglify())
    .pipe(header(getCopyright(), {version: getVersion()}))
    .pipe(gulp.dest('workspace/js'));
});
 



/*

  Default tasks

*/
gulp.task('default', ['scripts', 'minify-css']);