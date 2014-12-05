/*global jQuery, Handlebars, templatize, location, _ */
jQuery(function($) {

    'use strict';

    /*
     * Thank you app
     */
    var ThanksApp = {
        /*
         * initialize the thankyou App
         */
        init: function() {
            console.log('initializing thanksapp');

            var template = Handlebars.compile(
                    templatize.apply('thanks'), {}
                );

            var parameters = _.chain(location.search.slice(1).split('&'))
                .map(function(item) {
                    if (item) {
                        return item.split('=');
                    }}).compact().object().value();

            $.ajaxSetup({
                beforeSend:function(){
                    // start spinning the indicator before we make ajax call to finalize registration
                    $('#finishing').show();
                },
                complete:function(){
                    // stop spinning the indicator after we finalize registration
                    $('#finishing').hide();
                }
            });

            $.ajax({
                type: 'POST',
                url: '//localhost:4040/wow/paypal',
                dataType: 'json',
                data: JSON.stringify(parameters)
            }).done(function(msg) {
                // console.info('response: ' + JSON.stringify(msg));
                var context;
                switch(msg.errorCode) {
                    case 1002:
                        context = {
                            alreadyRegistered: true,
                            attendees: msg.error.attendees,
                            confirmationNumber: msg.error.payPalTxId,
                            completedOn: msg.error.completedOn
                        };
                        break;
                    case 1001:
                    case 1000:
                        context = {
                            wowServerError: true,
                            wowAdminFirstName: msg.error.firstName,
                            wowAdminLastName: msg.error.lastName,
                            wowAdminEmail: msg.error.email,
                            wowAdminRole: msg.error.role
                        };
                        break;
                    default:
                        // default is no error
                        context = {
                            thanks: true,
                            attendees: msg.response.attendees,
                            confirmationNumber: msg.response.payPalTxId,
                            completedOn: msg.response.completedOn
                        };
                        break;
                }

                // pass context into template
                var html = template(context);
                // render template
                $('#thankyou').html(html);

            }).fail(function() {
                var context = {
                    wowServerError: true,
                    wowAdminFirstName: 'Brooke',
                    wowAdminLastName: 'Martin',
                    wowAdminEmail: 'brooke@womenofworthiness.com',
                    wowAdminRole: 'Event Coordinator'
                };

                // pass context into template
                var html = template(context);
                // render template
                $('#thankyou').html(html);

            });

        }
    };

    ThanksApp.init();

});