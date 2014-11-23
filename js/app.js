/*global jQuery, Handlebars, _, templatize, TAFFY */
jQuery(function($) {

	'use strict';

	/*
	 * Handlebar helpers that tweak data in the model for view specific purposes
	 */
	Handlebars.registerHelper('fullName', function(attendee) {
		return attendee.firstName + ' ' + attendee.lastName;
	});

	/*
	 * States of Merica
	 */
	var states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
		'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii',
		'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
		'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
		'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
		'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
		'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
		'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
		'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
	];	

	/*
	 * Wow Shirt selections
	 */
	var wowShirts = ['None', 'Xtra-Small $10', 'Small $10', 'Medium $10',
		'Large $11', 'Xtra-Large $12', 'Xtra-Xtra-Large $12'];

    /*
     * Room w/ 1 - $185 /each
     * Room w/ 2 - $115 /each
     * Room w/ 3 - $95 /each
     * Room w/ 4 - $85 /each
     * Room w/ 5 - $85 /each
     * Room w/ 6 - $85 /each
     */
    var roomCosts = [185, 115, 95, 85, 85, 85];

	var substringMatcher = function(strs) {
		return function findMatches(q, cb) {
			var matches, substrRegex;

			// an array that will be populated with substring matches
			matches = [];

			// regex used to determine if a string contains the substring `q`
			substrRegex = new RegExp(q, 'i');

			// iterate through the pool of strings and for any string that
			// contains the substring `q`, add it to the `matches` array
			$.each(strs, function(i, str) {
		  		if(substrRegex.test(str)) {
		    		// the typeahead jQuery plugin expects suggestions to a
		    		// JavaScript object, refer to typeahead docs  more info
		    		matches.push({ value: str });
		  		}
			});

			cb(matches);
		};
	};

	var matchOrShowAll = function(strs) {

		return function findMatches(q, cb) {
			var matches, substrRegex;

			// an array that will be populated with substring matches
			matches = [];

			// regex used to determine if a string contains the substring `q`
			substrRegex = new RegExp(q, 'i');

			// iterate through the pool of strings and for any string that
			// contains the substring `q`, add it to the `matches` array
			$.each(strs, function(i, str) {
		  		if(substrRegex.test(str)) {
		    		// the typeahead jQuery plugin expects suggestions to a
		    		// JavaScript object, refer to typeahead docs for more info
		    		matches.push({ value: str });
		  		}
			});

			// if no match we just supply all options
			if(matches.length === 0) {
				$.each(strs, function(i, str) {
			    	matches.push({ value: str });
				});
			} else {
				// otherwise return matches
				cb(matches);
			}
		};
	};

	/*
	 * Validate the different inputs
	 */
	var validate = (function() {

		var textInput = function(text, minLength, maxLength, success, error) {
			var str = $.trim(text);
			if(str.length < minLength || str.length > maxLength) {
				error('text must be at least ' + minLength + ' characters and no more than ' + maxLength + ' characters');
				return;
			}
			if(str !== '') {
				var regex = /^[\w\-\.\,\'\s]+$/;
				if(!regex.test(str)) {
					error('Alphanumeric only please!');
				} else {
			    	success('text is valid');
			  	}
			} else {
				// empty value, make note because form can't be submitted this way
				error('text is empty');
			}
		};

		var matchOne = function(list, text, success, error) {
			var found = false;
			$.each(list, function(i, item) {
		  		if(text.toLowerCase() === item.toLowerCase()) {
		    		success(item);
		    		found = true;
		  		}
			});
			if(found===false) {
				error('Did not find a match!');
			}
		};		

		var hasSuccess = function($element) {
			$element.next('span.glyphicon').removeClass('glyphicon-remove');
			$element.parent('div.form-group').removeClass('has-error');        
			$element.next('span.glyphicon').addClass('glyphicon-ok');
			$element.parent('div.form-group').addClass('has-success'); 
		};

		var hasError = function($element) {
			$element.next('span.glyphicon').removeClass('glyphicon-ok');
			$element.parent('div.form-group').removeClass('has-success'); 
			$element.next('span.glyphicon').addClass('glyphicon-remove');
			$element.parent('div.form-group').addClass('has-error');
		};

		var clearGlyphicon = function($element) {
			$element.next('span.glyphicon').removeClass('glyphicon-remove');
			$element.parent('div.form-group').removeClass('has-error');			
			$element.next('span.glyphicon').removeClass('glyphicon-ok');
			$element.parent('div.form-group').removeClass('has-success'); 
		};


		return {
			textInput : textInput,
			matchOne : matchOne,
			hasSuccess : hasSuccess,
			hasError : hasError,
			clearGlyphicon : clearGlyphicon
		};
	}());

	/*
	 * Main WowReg application
	 */
	var App = {
		/*
		 * initialize the wowreg App
		 */
		init: function() {
			console.log('initializing wowregapp');
			this.initModel();
			this.cacheElements();
			this.render();
            $('#paySpinner').hide();
        },

		/*
		 * initialize model
		 */
		initModel: function() {
			this.attendeeDb = TAFFY();
			this.attendeeId = 1;
		},

        /*
         * Cache certain elements of the DOM and templates for ease of use.
         */
		cacheElements: function() {
			this.attendeeTemplate = Handlebars.compile(
				templatize.apply('attendee'), {}
			);
			this.headerSectionTemplate = Handlebars.compile(
				templatize.apply('header'), {}
			);
			this.registeredTemplate = Handlebars.compile(
				templatize.apply('registered'), {}
			);			
			this.footerTemplate = Handlebars.compile(
				templatize.apply('footer'), {}
			);
            this.paypalRedirectTemplate = Handlebars.compile(
                templatize.apply('paypalredirect'), {}
            );
			this.$wowApp = $('#wowapp');
			this.$headerSection  = this.$wowApp.find('#header-section');
            this.$paypalRedirectForm = this.$wowApp.find('#paypalredirect-form');
			this.$attendeeForm   = this.$wowApp.find('#attendee-form');
			this.$registeredTable = this.$wowApp.find('#registered-form');
			this.$footerSection  = this.$wowApp.find('#footer-section');
			this.$header = this.$wowApp.find('#header');
			this.$main   = this.$wowApp.find('#main');
			this.$footer = this.$wowApp.find('#footer');
			this.feedback = '';

		},

		/*
		 * bind event sources and handlers together for attendeeForm
		 */
		bindAttendeeFormEvents: function() {

			this.$attendeeForm.find('#wowStateTypeahead .typeahead').typeahead({
					hint: true,
					highlight: true,
					minLength: 1
				}, {
					name: 'states',
					displayKey: 'value',
					source: substringMatcher(states),
					templates: {
				  		empty: [
				    		'<div class="empty-message">',
				    		'Whatcha talkin about Willis',
				    		'</div>'
				  		].join('\n'),
   						suggestion: Handlebars.compile('<p><strong>&nbsp;&nbsp;{{value}}</strong></p>')
					}
				}
			);
			this.$attendeeForm.find('#wowAgeClassTypeahead .typeahead').typeahead({
					hint: true,
					highlight: true,
					minLength: 0
				}, {
					name: 'ageClass',
					displayKey: 'value',
					source: matchOrShowAll(['Adult', 'Teen']),
					templates: {
				  		empty: [
				    		'<div class="empty-message">',
				    		'Whatcha talkin about Willis',
				    		'</div>'
				  		].join('\n'),
   						suggestion: Handlebars.compile('<p><strong>&nbsp;&nbsp;{{value}}</strong></p>')
					}
				}
			);
			this.$attendeeForm.find('#wowAgeClassTypeahead .typeahead').on('click', function() {
			    var ev = $.Event('keydown');
			    ev.keyCode = ev.which = 40;
			    $(this).trigger(ev);
			    return true;
			});
			this.$attendeeForm.find('#wowShirtTypeahead .typeahead').typeahead({
					hint: true,
					highlight: true,
					minLength: 0
				}, {
					name: 'shirt',
					displayKey: 'value',
					source: matchOrShowAll(['None', 'Xtra-Small $10',
						'Small $10',
						'Medium $10',
						'Large $11',
						'Xtra-Large $12',
						'Xtra-Xtra-Large $12']),
					templates: {
				  		empty: [
				    		'<div class="empty-message">',
				    		'Whatcha talkin about Willis',
				    		'</div>'
				  		].join('\n'),
   						suggestion: Handlebars.compile('<p><strong>&nbsp;&nbsp;{{value}}</strong></p>')
					}
				}
			);
			this.$attendeeForm.find('#wowShirtTypeahead .typeahead').on('click', function() {
			    var ev = $.Event('keydown');
			    ev.keyCode = ev.which = 40;
			    $(this).trigger(ev);
			    return true;
			});

			this.$attendeeForm.find('#wowFirstName')
				.on('keyup change blur', function() {
			    	var $this = $(this);
			    	validate.textInput($this.val(), 2, 48,
				      	function (success) {
				      		console.info('wowFirstName: ' + success);
				        	validate.hasSuccess($this); 
				      	},
				      	function (error) {
				      		console.info('wowFirstName: ' + error);				      		
				      		if($this.val().length===0) {
				      			validate.clearGlyphicon($this);				      			
				      			return;
				      		}
				        	validate.hasError($this);
				      	}
				    );				
				}
			);
			this.$attendeeForm.find('#wowLastName')
				.on('keyup change blur', function() {
			    	var $this = $(this);
			    	validate.textInput($this.val(), 2, 48,
				      	function (success) {
				      		console.info('wowLastName: ' + success);				      		
				        	validate.hasSuccess($this);    
				      	},
				      	function (error) {
				      		console.info('wowLastName: ' + error);				      		
				      		if($this.val().length===0) {
				      			validate.clearGlyphicon($this);				      			
				      			return;
				      		}
				        	validate.hasError($this);
				      	}
				    );				
				}
			);
			this.$attendeeForm.find('#wowAddress')
				.on('keyup change blur', function() {
			    	var $this = $(this);
			    	validate.textInput($this.val(), 2, 64,
				      	function (success) {
				      		console.info('wowAddress: ' + success);				      		
				        	validate.hasSuccess($this);  
				      	},
				      	function (error) {
				      		console.info('wowAddress: ' + error);				      		
				      		if($this.val().length===0) {
				      			validate.clearGlyphicon($this);				      			
				      			return;
				      		}
				        	validate.hasError($this);
				      	}
				    );				
				}
			);	
			this.$attendeeForm.find('#wowState')
				.on('keyup change blur', function() {
			    	var $this = $(this);
			    	validate.matchOne(states, $this.val(),
			    		function (matched) {
				      		// need to pass $this.parent because typeahead
				      		// wraps this with a span
				        	validate.hasSuccess($this.parent());    
				        	$this.val(matched);				        	
				      	},
				      	function (error) {
				      		console.info('wowState: ' + error);				      		
				      		if($this.val().length===0) {
				      			validate.clearGlyphicon($this.parent());				      			
				      			return;
				      		}
				        	validate.hasError($this.parent());
				      	}
				    );				
				}
			);	
			this.$attendeeForm.find('#wowAgeClass')
				.on('keyup change blur', function() {
			    	var $this = $(this);
			    	validate.matchOne(['Adult', 'Teen'], $this.val(),
				      	function (matched) {
				      		// need to pass $this.parent because typeahead
				      		// wraps this with a span
				        	validate.hasSuccess($this.parent());  
				        	$this.val(matched);  
				      	},
				      	function (error) {
				      		console.info('wowAgeClass: ' + error);				      		
				      		if($this.val().length===0) {
				      			validate.clearGlyphicon($this.parent());				      			
				      			return;
				      		}
				        	validate.hasError($this.parent());
				      	}
				    );				
				}
			);								
			this.$attendeeForm.find('#wowCity')
				.on('keyup change blur', function() {
			    	var $this = $(this);
			    	validate.textInput($this.val(), 2, 48,
				      	function (success) {
				      		console.info('wowCity: ' + success);				      		
				        	validate.hasSuccess($this); 
				      	},
				      	function (error) {
				      		console.info('wowCity: ' + error);
				      		if($this.val().length===0) {
				      			validate.clearGlyphicon($this);				      			
				      			return;
				      		}
				        	validate.hasError($this);
				      	}
				    );				
				}
			);
			this.$attendeeForm.find('#wowPhone').formance('format_phone_number')
				.on('keyup change blur', function() { 
					if($(this).formance('validate_phone_number')) {
						validate.hasSuccess($(this));
					} else {
						var $this = $(this);
			      		if($this.val().length===0) {
			      			validate.clearGlyphicon($this);				      			
			      			return;
			      		}
			        	validate.hasError($this);
			        }
		  		}
		  	);
			this.$attendeeForm.find('#wowEmail').formance('format_email')
				.on('keyup change blur', function() { 
					if($(this).formance('validate_email')) {
						validate.hasSuccess($(this));
					} else {
						var $this = $(this);
			      		if($this.val().length===0) {
			      			validate.clearGlyphicon($this);				      			
			      			return;
			      		}
			        	validate.hasError($this);
		  			}
		  		}
		  	);					
			this.$attendeeForm.find('#wowZipCode').formance('format_number')
				.on('keyup change blur', function() { 
					if($(this).formance('validate_number')) {
						validate.hasSuccess($(this));
					} else {
						var $this = $(this);
			      		if($this.val().length===0) {
			      			validate.clearGlyphicon($this);				      			
			      			return;
			      		}
			        	validate.hasError($this);
		  			}
		  		}
		  	);
			this.$attendeeForm.find('#wowDonation').formance('format_money_simple')
				.on('keyup change blur', function() { 
					if($(this).formance('validate_money_simple')) {
						validate.hasSuccess($(this));	
					} else {
						var $this = $(this);
			      		if($this.val().length===0) {
			      			validate.clearGlyphicon($this);				      			
			      			return;
			      		}
			        	validate.hasError($this);
			        }
		  		}
		  	);
			this.$attendeeForm.find('#wowShirt')
				.on('keyup change blur', function() {
			    	var $this = $(this);
			    	validate.matchOne(wowShirts, $this.val(),
				      	function (matched) {
				      		// need to pass $this.parent because typeahead
				      		// wraps this with a span
				        	validate.hasSuccess($this.parent());    
				        	$this.val(matched);				        	
				      	},
				      	function (error) {
				      		console.info('wowShirt: ' + error);				      		
				      		if($this.val().length===0) {
				      			validate.clearGlyphicon($this.parent());				      			
				      			return;
				      		}
				        	validate.hasError($this.parent());
				      	}
				    );				
				}
			);

            this.$attendeeForm.find('#wowPoc')
                .on('change', this.pocChanged.bind(this));

			this.$attendeeForm.find('#prevButton')
				.on('click', this.previousAttendee.bind(this));

			this.$attendeeForm.find('#addAttendeeButton')
				.on('click', this.addAttendee.bind(this));

			this.$attendeeForm.find('#nextButton')
				.on('click', this.nextAttendee.bind(this));

			$('[data-toggle=tooltip]').tooltip();
		},

		/*
		 * bind event source and handlers together for attendeeTable
		 */
		bindAttendeeTableEvents: function() {

            this.$registeredTable.find('.clickableRow [id*=edit-]')
                .on('click', this.editAttendee.bind(this));

            this.$registeredTable.find('.clickableRow [id*=trash-]')
                .on('click', this.removeAttendee.bind(this));

		},

        /*
         * bind event source and handlers for controls on the footer, controls such as the pay button
         * cha-ching
         */
        bindAttendeeFooterEvents: function() {

            var _self = this;

            this.$footerSection.find('#payButton')
                .on('click', this.showConfirmation.bind(this));

            this.$footerSection.find('#wowConfirmDialog')
                .on('shown.bs.modal', function() {

                    $(this).find('#wowCancel').on('click', function() {
                        _self.doCancel();
                    });

                    $(this).find('#wowConfirm').on('click', function() {
                        _self.pay();
                    });
                });
        },

		/*
		 * Check if adding this attendee is okay according to the business rules,
		 * this includes input data validation and actual core business rules
		 * defined by the wowconf folks.
		 */
		passBusinessRules: function(attendee) {
            var problemWidgets = [];
			if(!attendee) {
				return false;
			}

            if(attendee.poc === true) {
                // enforce all fields
                problemWidgets = this.hasError([
                    '#wowFirstNameWidget', '#wowLastNameWidget', '#wowEmailWidget',
                    '#wowPhoneWidget', '#wowAgeClassWidget', '#wowAddressWidget',
                    '#wowZipCodeWidget', '#wowCityWidget', '#wowStateWidget',
                    '#wowShirtWidget'
                ]);

            } else {
                // enforce just the core fields
                problemWidgets = this.hasError([
                    '#wowFirstNameWidget', '#wowLastNameWidget', '#wowEmailWidget',
                    '#wowAgeClassWidget', '#wowShirtWidget'
                ]);
            }

            for(var i = 0; i < problemWidgets.length; i++) {
                problemWidgets[i].children('.glyphicon').addClass('glyphicon-remove');

            }

			return problemWidgets.length > 0 ? false : true;
		},

        emptyOrError: function(widgetId) {
            if(this.$attendeeForm.find(widgetId).hasClass('has-error')===true) {
                return true;
            }
            if(
                (this.$attendeeForm.find(widgetId).hasClass('has-error')===false) &&
                (this.$attendeeForm.find(widgetId).hasClass('has-success')===false)
              ) {
                // when nothing has been entered into wowFirstName then widget
                // will not have has-error or has-success classes
                return true;
            }

            return false;
        },

        hasError: function(widgets) {
            var problemWidgets = [];
            for(var i = 0; i < widgets.length; i++) {
                if(this.emptyOrError(widgets[i])===true) {
                    problemWidgets.push(this.$attendeeForm.find(widgets[i]));
                }
            }
            return problemWidgets;
        },

        updateCosts: function() {

            // compute (adjust) room cost for each attendee because cost per attendee
            // goes down with more attendees
            this.computeRoomCost();

            // compute cost and make cost adjustments for each attendee based on business rules
            var attendees = this.attendeeDb().order('attendeeId asec').get();
            var _self = this;
            $.each(attendees, function(i, person) {
                _self.computeCost(person);
            });
        },

        /**
         * Compute cost for given attendee.
         * @param attendee
         */
        computeCost: function(attendee) {
            var cost = 0, roomCost;
            if(attendee.shirt === 'None') {
                attendee.shirtCost = null;
            } else {
                attendee.shirtSize = attendee.shirt.slice(0, attendee.shirt.length-3).trim();
                attendee.shirtCost = parseInt(attendee.shirt.slice(-2));
                cost += attendee.shirtCost;
            }
            if(isNaN(parseInt(attendee.donation.slice(1).trim()))===false) {
                attendee.donationCost = parseInt(attendee.donation.slice(1).trim());
                cost += attendee.donationCost;
            } else {
                attendee.donationCost = null;
            }

            // get room cost here
            roomCost = this.attendeeDb({attendeeId: attendee.attendeeId}).select('room');
            cost += roomCost[0];
            attendee.cost = cost;

            this.attendeeDb({attendeeId: attendee.attendeeId})
                .update({
                    shirtCost: attendee.shirtCost,
                    shirtSize: attendee.shirtSize,
                    donationCost: attendee.donationCost,
                    cost: attendee.cost
                });

            return;
        },

        computeRoomCost: function() {

            var n = this.attendeeDb().count();
            if(n <= 0) {
                console.info('computeAdjustedCost() was called but there are no attendees.');
                return;
            }

            if(n > 6) {
                console.info('computeAdjustedCost() ruh roh scooby we have more ' +
                    'than 6 attendees in a room: ' + ' ' + n);
                return;
            }

            // update the cost per attendee according to how many attendees have registered
            this.attendeeDb().update({room: roomCosts[n-1]});

            // Once there are 4 in a room
            //     if one of the attendees is a teen,
            //         the rate for each teen is $50.
            // If there are less than 4 in a room
            //     the teen is charged the regular price.
            if(n >= 4) {
                this.attendeeDb({ageClass:'Teen'}).update({room: 50});
            }
         },

		/*
		 * create an attendee
		 */
		addAttendee: function() {

            // If the button has changed purposes and this is called for some reason then we don't
            // add an attendee because presumably the user is updating an attendee.
            if(this.$attendeeForm.find('#addAttendeeButton').html() === 'Save') {
                return;
            }

			var attendee = this.attendeeFromForm(this.attendeeId);
            if(attendee.attendeeId === 1) {
                attendee.poc = true;
            }
			if(this.passBusinessRules(attendee) === false) {
				// throw up some message to user and return
				return;
			}

			this.attendeeDb.insert(attendee);
            // increment attendeeId generator
            this.attendeeId++;

            // update attendee costs based on business rules
            this.updateCosts();
            // this will render an empty attendee form ready for next attendee entry
			this.renderAttendeeForm();
            // this will add the inserted attendee to the table
			this.renderAttendeeTable();	
		},

        /**
         * Snatch the current attendee from the form fields
         */
        attendeeFromForm: function(attendeeId) {
            var ca = {};
            if(attendeeId === undefined) {
                ca.attendeeId = parseInt(this.$attendeeForm.find('#wowAttendeeId').val());
            } else {
                ca.attendeeId = parseInt(attendeeId);
            }
            ca.firstName = this.$attendeeForm.find('#wowFirstName').val();
            ca.lastName = this.$attendeeForm.find('#wowLastName').val();
            ca.address = this.$attendeeForm.find('#wowAddress').val();
            ca.city = this.$attendeeForm.find('#wowCity').val();
            ca.state = this.$attendeeForm.find('#wowState').val();
            ca.zip = this.$attendeeForm.find('#wowZipCode').val();
            ca.email = this.$attendeeForm.find('#wowEmail').val();
            ca.phone = this.$attendeeForm.find('#wowPhone').val();
            ca.ageClass = this.$attendeeForm.find('#wowAgeClass').val();
            ca.donation = this.$attendeeForm.find('#wowDonation').val();
            ca.shirt = this.$attendeeForm.find('#wowShirt').val();
            ca.poc = (this.$attendeeForm.find('#wowPoc').val() === 'true');

            return ca;
        },

        /**
         * Accept an attendee and place onto attendeeForm
         * @param attendee
         */
        editAttendee: function(event) {
            // get attendeeId from attendeeTable's dom
            var attendeeId = $(event.currentTarget).attr('id').replace(/^.+-/,'');
            // find attendee from attendeeId
            var attendee = this.attendeeDb({attendeeId: parseInt(attendeeId)}).first();
            // load attendee into attendeeForm
            this.renderAttendeeForm(attendee);
            // change 'Add Lady' button to read: 'Save'
            this.$attendeeForm.find('#addAttendeeButton').html('Save');
            // attach click listener to Save button
            var _self = this;
            this.$attendeeForm.find('#addAttendeeButton')
                .on('click', function() {
                    // if Save clicked then update model and re-render registration table
                    var updatedAttendee = _self.attendeeFromForm(attendeeId);
                    _self.computeCost(updatedAttendee);
                    _self.updateAttendee(updatedAttendee);
                    _self.updateCosts();
                    _self.renderAttendeeForm();
                    _self.renderAttendeeTable();
                });
        },

		/*
		 * Load the previous attendee from model into attendee form but
		 * before doing so save current content in attendee form so user
		 * can return and finish up.  If this method is called and pointer
		 * is at beginning of attendee list then circle back to end of list.
		 */
        previousAttendee: function() {
            var curAttendee = this.attendeeFromForm(), rec;
            if(isNaN(curAttendee.attendeeId)) {
                rec = this.attendeeDb().order('attendeeId desc').first();
            } else {
                rec = this.attendeeDb({attendeeId:{lt:curAttendee.attendeeId}})
                    .order('attendeeId desc').first();
            }
            // there is no prev
            if(rec === false) {
                // so loop back to end
                this.renderAttendeeForm();
            } else {
                this.renderAttendeeForm(rec);
            }
        },

        /**
         * Next button was clicked so get the current state of the attendee form and
         * load the next attendee (if any) into the form, otherwise just reset form
         * with an blank attendee.
         */
        nextAttendee: function() {
            var curAttendee = this.attendeeFromForm(), rec;
            if(isNaN(curAttendee.attendeeId)) {
                // next was clicked on a form with an un-committed attendee (thus no attendeeId)
                // so in this context next loops back to start
                rec = this.attendeeDb().order('attendeeId asec').first();
            } else {
                rec = this.attendeeDb({attendeeId:{gt:curAttendee.attendeeId}})
                    .order('attendeeId asec').first();
            }
            // there is no next
            if(rec === false) {
                // so loop back to start
                // rec = this.attendeeDb().order('attendeeId asec').first();
                this.renderAttendeeForm();
            } else {
                // pull attendee from model and project onto view
                this.renderAttendeeForm(rec);
            }
        },

		/*
		 * update an attendee
		 */ 
		updateAttendee: function (updatedAttendee) {
            this.attendeeDb({attendeeId: updatedAttendee.attendeeId}).update(updatedAttendee);
		},

        /*
         * point-of-contact changed on GUI
         */
        pocChanged: function() {
            // get current attendee with new poc value
            var curAttendee = this.attendeeFromForm();
            if(isNaN(curAttendee.attendeeId)===false) {
                // update actual attendee
                this.updateAttendee(curAttendee);
            }

            if(this.$attendeeForm.find('#addAttendeeButton').html() === 'Save') {
                return;
            }
            this.renderAttendeeForm(curAttendee);
        },

        /**
         * Remove an attendee from model
         * @param event
         */
		removeAttendee: function(event) {
            var attendeeId = $(event.currentTarget).attr('id').replace(/^.+-/,'');
            var n = this.attendeeDb({attendeeId: parseInt(attendeeId)}).remove();
            if(n !== 1) {
                console.error('removeAttendee: Could not remove attendee: ' + attendeeId);
            }
            this.updateCosts();
            this.renderAttendeeForm();
            this.renderAttendeeTable();
        },

        /**
         * Perform a confirmation, ask user to confirm they are ready to pay because
         * they cannot make changes to group after they choose to pay.
         */
        showConfirmation: function() {

            var attendees = this.attendeeDb().order('attendeeId asec').get();

            if(attendees === false || attendees === null || attendees === undefined || attendees.length === 0) {
                this.$footerSection.find('#wowWhoopsieDialog').modal('show');
                return;
            }

            this.$footerSection.find('#wowConfirmDialog').modal('show');
        },

        doCancel: function() {
            this.$footerSection.find('#paySpinner').hide();
            this.$footerSection.find('#wowConfirmDialog').modal('hide');
        },

		/*
		 * commit registration info and send to paypal for payment
		 */
		pay: function() {

            console.info('Paying...');
            this.$footerSection.find('#paySpinner').show();

            var attendees = this.attendeeDb().order('attendeeId asec').get(),
                groupTotalCost = 0,
                _self = this;

            if(attendees === false || attendees === null || attendees === undefined) {
                console.info('pay() was called but there are no attendees.');
                return;
            }

            // touch every attendee and read the cost field, see computeCost.
            $.each(attendees, function (i, attendee) {
                groupTotalCost += attendee.cost;
            });

            var postData = {
                'groupTotalCost' : groupTotalCost,
                'attendees' : attendees
            };

            $.ajax({
                type: 'POST',
                url: '//localhost:4040/wow/pay', /* TODO this will need to change, see code on wowconf.org */
                dataType: 'json',
                data: JSON.stringify(postData)
            }).done(function(msg) {
                if(msg.error) {
                    console.info(msg.error);
                } else {
                    _self.$footerSection.find('#paySpinner').hide();
                    _self.$footerSection.find('#wowConfirmDialog').modal('hide');
                    _self.renderPayPalRedirectForm(msg);
                }
            }).fail(function(msg) {
                if(msg.error) {
                    console.info(msg.error);
                }
            });
		},

		/*
		 * render the attendee form
		 */
		renderAttendeeForm: function(attendee) {

			if(!attendee) {
				attendee = {};
			}
			this.$attendeeForm.html(this.attendeeTemplate({
                attendeeId: attendee.attendeeId,
				firstName: attendee.firstName,
				lastName: attendee.lastName,
				email: attendee.email,
				phone: attendee.phone,
				address: attendee.address,
				zip: attendee.zip,
				city: attendee.city,
				state: attendee.state,
				shirt: attendee.shirt,
				ageClass: attendee.ageClass,
				donation: attendee.donation,
				poc: attendee.poc
			}));
			// BIND FORM EVENTS
			this.bindAttendeeFormEvents();
		},

		/*
		 * Render the attendee table
		 */
		renderAttendeeTable: function() {
            var attendees = this.attendeeDb().order('attendeeId asec').get(),
                groupTotalCost = 0;
            if(attendees === false) {
                attendees = undefined;
            }

            if(attendees !== undefined) {
                $.each(attendees, function (i, attendee) {
                    groupTotalCost += attendee.cost;
                });
                if(groupTotalCost === 0) {
                    groupTotalCost = null;
                }
            }

			this.$registeredTable.html(this.registeredTemplate({
				// bind data should go here
				attendees: attendees,
                groupTotalCost: groupTotalCost
			}));

			// BIND TABLE EVENTS
			this.bindAttendeeTableEvents();
		},

        /*
         * Render footer that contains pay button and bot buttons
         */
        renderFooterSection: function() {
            this.$footerSection.html(this.footerTemplate({
                // footer bind data should go here
            }));
            // BIND FOOTER EVENTS
            this.bindAttendeeFooterEvents();
        },

        /*
         * Render paypal redirect form.  This is last page user sees before being
         * redirected to paypal.
         */
        renderPayPalRedirectForm: function(msg) {
            var approvalUrl = null, totalCost = 0, idx = 0;
            // TODO move this code (presentation code) into its own function
            // hide the other forms
            this.$attendeeForm.hide();
            this.$footerSection.hide();
            this.$registeredTable.hide();

            for(idx in msg.response.links) {
                if(msg.response.links[idx].rel === 'approval_url') {
                    approvalUrl = msg.response.links[idx].href;
                }
            }

            totalCost = msg.response.transactions[0].amount.total;

            // render paypal redirect form with countdown indicator
            this.$paypalRedirectForm.html(this.paypalRedirectTemplate({
                totalCost: totalCost,
                approvalUrl: approvalUrl
            }));
        },

		/*
		 * render() will bind data from the model into the view
		 */ 
		render: function() {
			this.$headerSection.html(this.headerSectionTemplate({
				title: 'WoW Conference 2015!'
			}));
			this.renderAttendeeForm({poc:true});
			this.renderAttendeeTable();
            this.renderFooterSection();

		}
	};

	App.init();
});
