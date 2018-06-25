var gulp = require('gulp');
var browserSync = require('browser-sync');
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var cp = require('child_process');
var sourcemaps = require('gulp-sourcemaps');
var include = require('gulp-include');
//@see https://www.npmjs.com/package/gulp-uglify
var uglify = require('gulp-uglify');
var pump = require('pump');
var modernizr = require('gulp-modernizr');

// @see https://gist.github.com/LoyEgor/e9dba0725b3ddbb8d1a68c91ca5452b5
var imagemin = require('gulp-imagemin');
var imageminPngquant = require('imagemin-pngquant');
var imageminZopfli = require('imagemin-zopfli');
var imageminMozjpeg = require('imagemin-mozjpeg'); //need to run 'brew install libpng'
var imageminGiflossy = require('imagemin-giflossy');

var jekyll = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
var messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll-build', function(done) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn(jekyll, ['build', '--baseurl', ''], {
            stdio: 'inherit'
        })
        .on('close', done);
});

/**
 * Rebuild Jekyll & do page reload
 */
gulp.task('jekyll-rebuild', ['jekyll-build'], function() {
    browserSync.reload();
});

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['sass', 'jekyll-build'], function() {
    browserSync({
        server: {
            baseDir: '_site',
            injectChanges: true
        }
    });
});

/**
 * Compile JS files from js/scripts.js using gulp-include
 */
gulp.task('scripts', function(cb) {
    pump(
        [
            gulp.src(['./js/src/*.js']),
            include(),
            gulp.dest('./js/src/build/'),
        ],
        cb
    );
});

/**
 * Compress and uglify JavaScript files
 */
gulp.task('compress', function(cb) {
    pump([
            gulp.src('js/src/build/*.js'),
            sourcemaps.init(),
            uglify(),
            sourcemaps.write(),
            gulp.dest('js')
        ],
        cb
    );
});


/**
 * Compile files from _scss into both _site/css (for live injecting) and site (for future jekyll builds)
 */
gulp.task('sass', function() {
    return gulp.src('_sass/main.scss')
        .pipe(sass({
            // includePaths: ['scss'],
            onError: browserSync.notify,
            outputStyle: 'compressed'
        }))
        .pipe(gulp.dest('_site/css'))
        .pipe(gulp.dest('css'))
        .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], {
            cascade: true
        }))
        .pipe(browserSync.reload({
            stream: true
        }));
    // .pipe(gulp.dest('css'));
});

/**
 * Build modernizr
 */
gulp.task('modernizr', function() {
    gulp.src('./js/*.js')
        .pipe(modernizr())
        .pipe(uglify())
        .pipe(gulp.dest("js/vendor/"));
});

/**
 * Minifiy images
 */
gulp.task('imagemin', function() {
    return gulp.src(['images/**/*.{gif,png,jpg,svg}'])
        .pipe(imagemin([
            //png
            imageminPngquant({
                speed: 1,
                quality: 98 //lossy settings
            }),
            imageminZopfli({
                more: true
            }),
            //gif
            // imagemin.gifsicle({
            //     interlaced: true,
            //     optimizationLevel: 3
            // }),
            //gif very light lossy, use only one of gifsicle or Giflossy
            imageminGiflossy({
                optimizationLevel: 3,
                optimize: 3, //keep-empty: Preserve empty transparent frames
                lossy: 2
            }),
            //svg
            imagemin.svgo({
                plugins: [{
                    removeViewBox: false
                }]
            }),
            //jpg lossless
            imagemin.jpegtran({
                progressive: true
            }),
            //jpg very light lossy, use vs jpegtran
            imageminMozjpeg({
                quality: 90
            })
        ]));
    // .pipe(gulp.dest('lib'));
});

/**
 * Watch scss files for changes & recompile
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function() {
    gulp.watch('_sass/*.scss', ['sass', 'jekyll-rebuild']);
    gulp.watch('assets/scss/*.scss', ['sass', 'jekyll-rebuild']);

    gulp.watch('js/src/*.js', ['scripts', 'compress', 'jekyll-rebuild']);
    gulp.watch('images/**/*.{gif,jpg,png}', ['imagemin']);
    gulp.watch(['*.html', '_data/*', '_layouts/*', '_includes/*', '*.md', '_events/*', '_posts/*', ], ['jekyll-rebuild']);
});

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['browser-sync', 'watch']);
