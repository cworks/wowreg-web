/*global $, _ */

'use strict';

/*
 * Convert a template into HTML
 */
var templatize = (function() {

    var apply = function(template, templateData) {
        if(!templatize.templateCache) {
            templatize.templateCache = {};
        }

        if(!templatize.templateCache[template]) {
            var templateDir = '/templates';
            var templateUrl = templateDir + '/' + template + '.html';
            var templateString;

            $.ajax({
                url: templateUrl,
                async: false
            }).done(function(data) {
                templateString = data;
            });

            templatize.templateCache[template] =
                _.template(templateString);
        }

        return templatize.templateCache[template](templateData);
    };
    return {
        templateCache: {},
        apply : apply
    };
}());


