'use strict';

// var proxySnippet = require('grunt-connect-proxy/lib/utils').proxyRequest;

module.exports = function(grunt) {

    grunt.initConfig({
        srcBuild:     ['Gruntfile.js'],        
        srcJs:        ['js/**/*.js'],
        srcHtml:      ['index.html', 'templates/*.html'],
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
         * Concat config - make one source file from many
         */
        concat: {
            options: {
                // delimiter to place between concat'ed files
                separator: ';'
            },
            dist: {
                // files to concatenate
                src: ['<%= srcJs %>'],
                // location of final file
                dest: '<%= dist %>/js/<%= pkg.name %>.js'
            }
        },

        /*
         * Uglify config - minimize our code so that it has a smaller footprint
         */
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            dist: {
                files: {
                    '<%= dist %>/js/<%= pkg.name %>.min.js' : ['<%= concat.dist.dest %>']
                }
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
                    removeAttributeQuotes: true,
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
         * Javascript code with slimer albeit uglier versions.
         */
        replace: {
            dist: {
                src: ['<%= dist %>/index.html'],
                overwrite: true,                 
                replacements: [{
                    from: '<script src="js/app.js"></script>',
                    to: '<script src="js/<%= pkg.name %>.min.js"></script>'
                }]
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
        'clean',
        'jshint',
        'concat',
        'uglify',
        'copy',
        'replace',
        'htmlmin'        
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
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-text-replace');

};