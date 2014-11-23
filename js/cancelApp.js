/*global jQuery, Handlebars, templatize, location, _ */
jQuery(function($) {
    'use strict';

    var CancelApp = {

        init: function() {
            console.log('initializing cancelapp');

            var template = Handlebars.compile(
                templatize.apply('cancel'), {}
            );

            var parameters = _.chain(location.search.slice(1).split('&'))
                .map(function(item) {
                    if (item) {
                        return item.split('=');
                    }}).compact().object().value();

            $.ajaxSetup({
                beforeSend:function(){
                    // start spinning the indicator before we make ajax call to cancel registration
                    $('#finishing').show();
                },
                complete:function(){
                    // stop spinning the indicator after we cancel registration
                    $('#finishing').hide();
                }
            });

            $.ajax({
                type: 'POST',
                url: '//localhost:4040/wow/cancel', /* TODO change to //www.wowconf.org/wow/cancel */
                dataType: 'json',
                data: JSON.stringify(parameters)
            }).done(function(msg) {
                var context = { attendees: msg.error };
                var html = template(context);
                // render template
                $('#cancelled').html(html);
            }).fail(function() {
                var context = { attendees: [] };
                var html = template(context);
                // render template
                $('#cancelled').html(html);
            });
        }
    };

    CancelApp.init();
});