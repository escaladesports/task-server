'use strict'
const watchExtensions = 'jpg,gif,jpeg,svg,png,css,php'
const snippetRules = {
	//match:  /<body[^>]*>/,
	match:  /$/,
	fn: function (snippet, match) {
		//return match + snippet
		return snippet + match
	}
}

module.exports = (config, cb) => {
	if(config.static === true) return staticSync(config, cb)
	const nodemon = require('nodemon')
	let started = false
	let restarting = false
	nodemon({
			script: './server.js',
			verbose: false,
			ignore: [
				config.src,
				config.dist,
				config.views
			],
			env: {
				NODE_ENV: 'development'
			}
		})
		.on('start', () => {
			console.log('Starting nodemon...')
			if(started === false){
				started = true
				setTimeout(() => {
					dynamicSync(config, cb)
				}, 500)
			}
		})
		.on('crash', () => {
			console.log('\nNodemon crashed')
			process.exit(0)
		})
		.on('exit', () => {
			if(restarting === false){
				console.log('\nNodemon exited')
				process.exit(0)
			}
			else{
				restarting = false
			}
		})
		.on('restart', () => {
			restarting = true
			console.log('\nNodemon restarted')
		})
}


function dynamicSync(config, cb){
	const browserSync = require('browser-sync').create()
	browserSync.init(null, {
		verbose: false,
		notify: false,
		proxy: `http://localhost:${config.php ? config.phpPort : false || process.env.PORT || 3000}`,
		port: process.env.BROWSERSYNC_PORT || config.browserSyncPort || 8080,
		files: [
			`${config.dist}/**/*.{${watchExtensions}}`
		],
		snippetOptions: snippetRules
	})
	if(cb) cb(browserSync)
}


// Only serve static files
function staticSync(config, cb){
	const path = require('path')
	const fs = require('fs')
	const url = require('url')
	const browserSync = require('browser-sync').create()
	const folder = path.resolve(__dirname, `../${config.dist}`)
	browserSync.init({
		notify: false,
		port: process.env.BROWSERSYNC_PORT || config.browserSyncPort || 8080,
		server: {
			directory: false,
			baseDir: config.dist,
			middleware: [
				// Prefer loading name.html over name/index.html
				(req, res, next) => {
					let fileName = url.parse(req.url)
					const ext = path.extname(req.url)
					if(ext) return next()
					fileName = fileName.href.split(fileName.search).join('')
					if(fileName[fileName.length - 1] === '/'){
						fileName = fileName.slice(0, -1)
					}
					fs.stat(`${folder + fileName}.html`, err => {
						if(!err && fileName.indexOf("browser-sync-client") < 0){
							if(fileName[fileName.length - 1] === '/'){
								fileName = fileName.slice(0, -1)
							}
							req.url = `${fileName}.html`
						}
						return next()
					})
				}
			],
			serveStaticOptions: {
				extensions: ['html']
			}
		},
		files: [
			`./${config.dist}/**/*.{${watchExtensions}}`
		],
		snippetOptions: snippetRules
	})
	if(cb) cb(browserSync)
}
