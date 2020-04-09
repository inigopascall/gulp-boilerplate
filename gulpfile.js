// Initialize modules
const gulp 			= require('gulp');
const sourcemaps 	= require('gulp-sourcemaps');
const sass 			= require('gulp-sass');
const concat 		= require('gulp-concat');
const terser 		= require('gulp-terser');
const babel 		= require('gulp-babel');
const postcss 		= require('gulp-postcss');
const autoprefixer 	= require('autoprefixer');
const cssnano 		= require('cssnano');
const replace 		= require('gulp-replace');
const rename 		= require('gulp-rename');
const base64 		= require('gulp-base64');
const browserSync 	= require('browser-sync').create();
const spritesmith 	= require('gulp.spritesmith');

/* ---------------------------------- CONFIG ---------------------------------- */

const localUrl 		= "localdomain.local"; 

const templatesPath = '../resources/views/';
const scssPath 		= 'dev/scss/';
const jsPath 		= 'dev/js/';

const scssInput 	= scssPath 	+ 'main.scss';
const jsInput 		= jsPath 	+ '**/*.js';

const jsOutput = {
	filename: 'build.js',
	path: './build/js/'
}

const cssOutput = {
	filename: 'build.css',
	path: './build/css/'
}

const cbTemplates	= [templatesPath + 'welcome.blade.php']; // template(s) containing links to versioned assets where ?v=xxx will be updated by find & replace

const base64options = {
	images: {
		exclude: ['sprites'],
		extensions: ['png'],
		maxImageSize: 20 * 1024, // convert all pngs under 20kb
		debug: false		
	},
	fonts: {
		extensions: ['woff2'],
		maxImageSize: 40 * 1024,
		debug: false
	}
}

const spritesConfig = {
	pathToRawFiles: 'dev/sprite_images/*.png',
	outputScss: {
		filename: 'sprites.scss',
		dirPath: './dev/scss/'
	},
	outputImg: {
		filename: 'sprites.png',
		dirPath: '/build/sprites/',
	}
}

const babelConfig = {
	presets: [
		["@babel/preset-env"]
	]
}

/* ---------------------------------- Browsersync ---------------------------------- */

const browserSyncController = {
	init: function(){
		browserSync.init({
			open: false,
			proxy: localUrl
		});
	},
	reload: browserSync.reload
}

/* ---------------------------------- Gulp tasks ---------------------------------- */

function createSprites(){
	var spriteData = gulp.src(spritesConfig.pathToRawFiles).pipe(spritesmith({
		imgName: spritesConfig.outputImg.filename,
		cssName: spritesConfig.outputScss.filename,
		imgPath: spritesConfig.outputImg.dirPath + spritesConfig.outputImg.filename
	}));
	spriteData.img.pipe(gulp.dest('.' + spritesConfig.outputImg.dirPath));
	spriteData.css.pipe(gulp.dest(spritesConfig.outputScss.dirPath));
	return spriteData;
}

function compileSCSS(){    
	return gulp.src(scssInput)
		.pipe(sourcemaps.init())
		.pipe(sass().on('error',sass.logError))
		.pipe(base64(base64options.images))
		.pipe(base64(base64options.fonts))
		.pipe(postcss([ autoprefixer(), cssnano() ]))
		.pipe(rename(cssOutput.filename))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(cssOutput.path)
	);
}

function compileJS(){
	return gulp.src([
		jsInput
		])
		.pipe(sourcemaps.init())
		.pipe(concat(jsOutput.filename))
		.pipe(babel(babelConfig))
		.pipe(terser())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(jsOutput.path)
	);
}

function bustCache(){
	let cbString = new Date().getTime();
	return gulp.src(cbTemplates)
		.pipe(replace(/\?v=\d+/g, '\?v=' + cbString))
		.pipe(gulp.dest(templatesPath));
}

function watch()
{
	browserSyncController.init();

	gulp.watch([scssInput, jsInput],
		{interval: 100, usePolling: true}, // needed for systems without fs.events() !
		gulp.series(
			gulp.parallel(compileSCSS, compileJS),
			bustCache
		)
	).on('change', browserSyncController.reload);

	gulp.watch(templatesPath + '**/*').on('change', browserSyncController.reload);
}

exports.default = gulp.series(
	createSprites,
	gulp.parallel(compileSCSS, compileJS),
	bustCache,
	watch
);
exports.sprites = createSprites;