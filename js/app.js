/*global jQuery, Handlebars, _, localStorage */
jQuery(function($) {

	'use strict';

	//var _ = (_ === 'undefined') ? {} : _;
	//var localStorage = (localStorage === 'undefined') ? {} : localStorage;

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
		    		// JavaScript object, refer to typeahead docs for more info
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
					async: false,
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
	 * localStorage for attendees kept in memory
	 */
	var WowDb = {
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		}
	};

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
			this.reRender();
		},

		/*
		 * initialize model
		 */
		initModel: function() {
			this.attendees = WowDb.store('wowreg-attendees');
			while(this.attendees.length > 0) {
			    this.attendees.pop();
			}
			this.attendees.unshift({
				firstName: '',
				lastName: '',
				poc: false,
				address: '',
				city: '',
				state: '',
				zip: '',
				email: '',
				phone: '',
				ageClass: '',
				donation: '',
				shirt: ''
			});			
			this.attendeePointer = 0;
		},

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
			this.$wowApp = $('#wowapp');
			this.$headerSection  = this.$wowApp.find('#header-section');
			this.$attendeeForm   = this.$wowApp.find('#attendee-form');
			this.$registeredForm = this.$wowApp.find('#registered-form');
			this.$footerSection  = this.$wowApp.find('#footer-section');
			this.$header = this.$wowApp.find('#header');
			this.$main   = this.$wowApp.find('#main');
			this.$footer = this.$wowApp.find('#footer');
			this.feedback = '';
		},

		bindEvents: function() {

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

			this.$attendeeForm.find('#prevButton')
				.on('click', this.previousAttendee.bind(this));

			this.$attendeeForm.find('#addAttendeeButton')
				.on('click', this.createAttendee.bind(this));

			this.$attendeeForm.find('#nextButton')
				.on('click', this.nextAttendee.bind(this));

		    this.$registeredForm.find('.clickableRow')
		    	.on('click', function() {
		    		console.info('clicked a row');
		    	});

			$('[data-toggle=tooltip]').tooltip();
		},

		/*
		 * create an attendee
		 */
		createAttendee: function() {
			// append new attendee onto attendees list
			this.attendees.unshift({
				attendeeColor: 'colorizeContainer' + (this.attendees.length-1),
				firstName: $('#wowFirstName').val(),
				lastName: $('#wowLastName').val(),
				poc: $('#wowPoc').val(),
				address: $('#wowAddress').val(),
				city: $('#wowCity').val(),
				state: $('#wowState').val(),
				zip: $('#wowZipCode').val(),
				email: $('#wowEmail').val(),
				phone: $('#wowPhone').val(),
				ageClass: $('#wowAgeClass').val(),
				donation: $('#wowDonation').val(),
				shirt: $('#wowShirt').val()
			});
			this.previousAttendee();
			this.addToTable();
			/*
			$.ajax({
				type: 'POST',
				url: 'http://localhost:4040/wow/register',
				dataType: 'json',
				data: JSON.stringify(attendeesRequest)
			}).done(function(msg) {
				if(msg.error) {
					this.feedback = msg.error;
				}					
			}).fail(function(msg) {
				if(msg.error) {
					this.feedback = msg.error;
				}	
			}).always(function(msg) {
				console.info("response: " + JSON.stringify(msg));
			});
			*/

			//this.render();		
			//this.bindEvents();	
		},

		/*
		 * Load the previous attendee from model into attendee form but
		 * before doing so save current content in attendee form so user
		 * can return and finish up.  If this method is called and pointer
		 * is at beginning of attendee list then circle back to end of list.
		 */
		previousAttendee: function() {
			if(this.attendeePointer >= (this.attendees.length-1)) {
				this.attendeePointer = -1;
			}
			this.attendeePointer++;
			console.info('attendeePointer: ' + this.attendeePointer);	
			if(this.attendeePointer === this.attendees.length-1) {
				this.attendees[this.attendeePointer].attendeeColor = 'colorizeContainer' + this.attendeePointer;
			}
			// pull attendee from model and project onto view
			this.renderAttendeeForm(this.attendees[this.attendeePointer]);		
		},

		/*
		 * Load the next attendee from model into attendee form but before
		 * doing so save current content in attendee form so user can return
		 * and finish up.  If this method is called and pointer is at end of
		 * attendee list then circle back to start of list.
		 */
		nextAttendee: function() {
			if(this.attendeePointer <= 0) {
				this.attendeePointer = this.attendees.length;
			}
			this.attendeePointer--;
			console.info('attendeePointer: ' + this.attendeePointer);
			if(this.attendeePointer === this.attendees.length-1) {
				this.attendees[this.attendeePointer].attendeeColor = 'colorizeContainer' + this.attendeePointer;
			}			
			// pull attendee from model and project onto view
			this.renderAttendeeForm(this.attendees[this.attendeePointer]);
		},

		/*
		 * update an attendee
		 */ 
		updateAttendee: function () {

		},	

		addToTable: function() {
			this.$registeredForm.html(this.registeredTemplate({
				// bind data should go here
				attendees: this.attendees.slice(0,this.attendees.length-1).reverse()
			}));
		},

		renderAttendeeForm: function(attendee) {

			if(!attendee) {
				return;
			}
			this.$attendeeForm.html(this.attendeeTemplate({
				attendeeColorClass: attendee.attendeeColor,
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
			this.bindEvents();
		},

		/*
		 * render() will bind data from the model into the view
		 */ 
		render: function() {
			this.$attendeeForm.html(this.attendeeTemplate({
				firstName: ''
			}));
			this.$headerSection.html(this.headerSectionTemplate({
				title: 'WoW Conference 2014!'
			}));
			this.$registeredForm.html(this.registeredTemplate({
				// bind data should go here
			}));
			this.$footerSection.html(this.footerTemplate({
				// bind data should go here
			}));		

			//WowDb.store('wowreg-attendees', this.attendees);				
		},

		reRender: function() {
			this.render(arguments);
			this.bindEvents();			
		}
	};

	App.init();
});