'use strict';

// var proxySnippet = require('grunt-connect-proxy/lib/utils').proxyRequest;

module.exports = function(grunt) {

    grunt.initConfig({
        srcBuild:     ['Gruntfile.js'],        
        srcJs:        ['js/**/*.js'],
        srcHtml:      ['index.html', 'cancelled.html', 'thankyou.html', 'templates/*.html'],
        srcCss:       ['styles/**/*.css'],
        srcAll:       ['<%= srcJs %>', '<%= srcHtml %>', '<%= srcCss %>'],
        libsAll:      ['assets/**/*', 'bower_components/**/*'],
        excludeAll:   ['!node_modules/**/*', '!.git*'],
        dist:         'webroot',
        build:        'build',
        pkg:          grunt.file.readJSON('package.json'),

        /*
         * Clean config - remove folders and files that can be regenerated
         */
        clean: {
            dist: '<%= dist %>',
            build: '<%= build %>'
        },

        /*
         * Copy config - copy this and that to here and there and everywhere
         * copy:dist - will copy resources into a webroot folder
         */
        copy: {
            dist: {
                files: [{
                    src: ['<%= srcAll %>', '<%= libsAll %>'],
                    dest: '<%= dist %>/'
                }]                
            }
        },

        /*
         * Jshint config - make sure we're writing clean Javascript code
         * linting options contained in .jshintrc
         */
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            files: ['<%= srcJs %>', '<%= srcBuild %>']
        },

        /*
         * Uglify config - minimize our code so that it has a smaller footprint
         */
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd h:MM:ss TT") %> */\n'
            },
            dist: {
                files: [
                    {
                        '<%= dist %>/js/app.min.js' : ['js/app.js']
                    },
                    {
                        '<%= dist %>/js/thanksApp.min.js' : ['js/thanksApp.js']
                    },
                    {
                        '<%= dist %>/js/cancelApp.min.js' : ['js/cancelApp.js']
                    },
                    {
                        '<%= dist %>/js/templatize.min.js' : ['js/templatize.js']
                    }
                ]
            }
        },

        /*
         * Htmlmin config - Minify html files
         */
        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    removeCommentsFromCDATA: true,              
                    collapseWhitespace: true,
                    collapseBooleanAttributes: true,
                    conservativeCollapse: true,
                    removeAttributeQuotes: false,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true
                },
                files: [{
                    expand: true,
                    cwd: '<%= dist %>',                    
                    src: '<%= srcHtml %>',
                    dest: '<%= dist %>/'
                }]
            }
        },

        /*
         * Replace config - Used to replace references to fat home-grown
         * Javascript code with slimmer albeit uglier versions.
         */
        replace: {
            toMinifiedUrl: {
                src: [
                    '<%= dist %>/index.html',
                    '<%= dist %>/thankyou.html',
                    '<%= dist %>/cancelled.html'
                ],
                overwrite: true,
                replacements: [
                    { from: '<script src="js/app.js"></script>', to: '<script src="js/app.min.js"></script>' },
                    { from: '<script src="js/thanksApp.js"></script>', to: '<script src="js/thanksApp.min.js"></script>' },
                    { from: '<script src="js/cancelApp.js"></script>', to: '<script src="js/cancelApp.min.js"></script>' },
                    { from: '<script src="js/templatize.js"></script>', to: '<script src="js/templatize.min.js"></script>' }
                ]
            },
            siteUrl: {
                src: [
                    '<%= dist %>/templates/cancel.html',
                    '<%= dist %>/templates/thanks.html'
                ],
                overwrite: true,
                replacements: [
                    { from: 'localhost', to: 'www.wowconf.org' }
                ]
            },
            serviceUrl: {
                src: [
                    '<%= dist %>/js/app.js',
                    '<%= dist %>/js/cancelApp.js',
                    '<%= dist %>/js/thanksApp.js'
                ],
                overwrite: true,
                replacements: [
                    { from: 'localhost:4040', to: 'www.wowconf.org'
                    }
                ]
            }
        },

        /*
         * Watch config - watch the following resources and react to changes
         * watch:js - when a Javascript files changes jshint it
         * watch:livereload - synch changes to livereload'er
         */ 
        watch: {
            css: {
                files: ['<%= srcCss %>']
            },
            html: {
                files: ['<%= srcHtml %>']
            },
            js: {
                files: ['<%= jshint.files %>'],
                tasks: ['jshint']
            },
            livereload: {
                options: {
                    livereload: 35729
                },
                files: [
                    '<%= srcCss %>',
                    '<%= srcHtml %>',
                    '<%= srcJs %>'
                ]
            }            
        },

        /*
         * Connect config - connect will launch a webserver whose life will
         * last as long as this grunt file is running.  Typically you will
         * want to use the watch task after this one to synch files to
         * webserver when they're modified.
         */
        connect: {
            options: {
                hostname: 'localhost',
                port: 9001,
                livereload: 35729
            },
            livereload: {
                options: {
                    open: true,
                    base: '.'
                }
            },   
            dist: {
                options: {
                    open: true,
                    base: '<%= dist %>',
                    livereload: false
                }
            }
        }

    });

    /*
     * Task that will boot a connect (https://github.com/senchalabs/connect)
     * http server, with livereload enabled and it will watch a set of
     * resources for modification then reload when a change is made.
     */
    grunt.registerTask('server', function (target) {     
        if (target === 'dist') {
          return grunt.task.run(['build', 'connect:dist:keepalive']);
        }        
        grunt.task.run([
          'connect:livereload',
          'watch'
        ]);
    });

    /*
     * Build order
     */
    grunt.registerTask('build', [
        'dev'
    ]);

    /*
     * Build a plain and simple development webroot
     */
    grunt.registerTask('dev', [
        'clean',
        'jshint',
        'copy'
    ]);

    /*
     * Extension of dev task that minimizes javascript & html and replaces
     * references to original code with minimized code.
     */
    grunt.registerTask('devmin', [
        'dev',
        'uglify',
        'replace:toMinifiedUrl',
        'htmlmin'
    ]);

    grunt.registerTask('prod', [
        'dev',
        'replace:siteUrl',
        'replace:serviceUrl'
    ]);

    grunt.registerTask('prodmin', [
        'devmin',
        'replace:siteUrl',
        'replace:serviceUrl'
    ]);

    // executed by just typing grunt on the command line
    grunt.registerTask('default', function() {
        grunt.task.run([
            'build'
        ]);
    });

    // load grunt plugins we need
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-text-replace');

};