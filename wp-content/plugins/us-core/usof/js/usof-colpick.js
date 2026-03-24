! function( $, _undefined ) {
	"use strict";

	const _document = document;
	const _window = window;

	const min = Math.min;
	const max = Math.max;
	const round = Math.round;

	function usofColorPicker( input, options ) {
		const self = this;

		// Elements
		self.$input = $( input );
		self.$window = $( _window );
		self.$document = $( _document );

		const $container = self.$input.closest( '.usof-color' );

		// Private "Variables"
		self.withGradient = $container.hasClass( 'with_gradient' );
		self.withColorList = $container.hasClass( 'with_color_list' );

		if ( self.$input.hasClass( 'active' ) ) {
			return;
		}
		self.$input.addClass( 'active' );

		// Get initial value
		let value = input.value;
		if ( self.isCssVariable( value ) ) {
			value = $ush.toString( $usof.getData( 'colorVars' )[ value ] ) || value;
		}
		self.value = value;

		/**
		 * @type {{}} Default color picker settings
		 */
		let defaults = {
			state: 'solid',
			height: 160, // Height of colorpicker area
			width: 160,
			angle: 220, // Width of angle box
			inputHeight: self.$input.height(),
			initialSecondColor: { // Default black color for gradient
				hex: '#000000',
				rgba: {
					r: 0,
					g: 0,
					b: 0,
					a: 1
				},
				hsba: {
					h: 360,
					s: 0,
					b: 0,
					a: 1,
				},
			},
			onChange: $.noop, // Default callback for USOF
			color: { // There might be more than one color
				first: {},
				second: {},
			},
			initialColor: self.value,
		};

		// Palette AJAX status to don't sent requests several times
		self.sending = false;

		// Main object for all the stuff
		self.colors = $.extend( {}, defaults, options || {} );

		/**
		 * @type {Boolean} Check whether the input accepts gradient values
		 */
		self.withGradient = self.$input.closest( '.usof-color' ).hasClass( 'with_gradient' );

		// Use a single instance for all the inputs
		self.$colpickTemplate = $( '.usof-colpick.usof-colpick-template:first' );

		// Remove all previous instances of the clone in case they weren't removed
		$( '.usof-colpick:not(.usof-colpick-template)' ).remove();

		// Clone and insert a template to a certain color input
		self.$colpick = self.$colpickTemplate.clone().removeClass( 'usof-colpick-template' );
		self.$colpick.insertAfter( self.$input );

		// Box for picking colors, changes along with hue
		self.$curentColorBox = $( '.first .usof-colpick-color', self.$colpick );
		self.$gradientColorBox = $( '.second .usof-colpick-color', self.$colpick );

		// Arrow of HUE bar
		self.$hueArr = $( '.first .usof-colpick-hue-selector', self.$colpick );
		self.$hueArr2 = $( '.second .usof-colpick-hue-selector', self.$colpick );

		// Alpha arrows
		self.$alphaArr = $( '.first .usof-colpick-alpha-selector', self.$colpick );
		self.$gradientAlphaArr = $( '.second .usof-colpick-alpha-selector', self.$colpick );

		// Alpha Containers
		self.$alphaContainer = $( '.first .usof-colpick-alpha', self.$colpick );
		self.$gradientAlphaContainer = $( '.second .usof-colpick-alpha', self.$colpick );

		// HUE containers
		self.$hueContainer = $( '.first .usof-colpick-hue', self.$colpick );
		self.$gradientHueContainer = $( '.second .usof-colpick-hue', self.$colpick );

		// Angle Container
		self.$angleContainer = $( '.usof-colpick-angle', self.$colpick );

		// Angle Arrow
		self.$angle = $( '.usof-colpick-angle-selector', self.$colpick );

		// Color dots
		self.$selector = $( '.first .usof-colpick-color-selector', self.$colpick );
		self.$gradientDot = $( '.second .usof-colpick-color-selector', self.$colpick );

		// State switchers Solid/Gradient
		self.$switchers = $( '.usof-radio input[type="radio"]', self.$colpick );
		self.$switchersBox = $( '.usof-radio', self.$colpick );

		// Do not proceed if the color value is not valid
		if ( ! self.colorIsValid( self.value ) ) {
			return;
		}

		// If the gradient is disabled but the value can hold the gradient, then we will convert it to HEX
		if ( ! self.withGradient && self.isGradient( self.value ) ) {
			self.value = self.gradientParser( self.value ).hex;
		}

		// Deactivate gradient colorpicker for certain inputs
		if ( ! self.withGradient ) {
			self.$switchersBox.remove();
			self.$angleContainer.remove(); // Remove just in case, probably someone will want to cheat
			$( '.second', self.$colpick ).remove();
		}

		self.setHuePosition();
		self.setColorToPreview();
		self.setDotPosition();
		self.setAlpha();

		self.$colpick.addClass( 'type_solid' );
		self.$colpick.removeClass( 'type_gradient' );

		if ( self.isGradient( self.value ) ) {
			self.setDotPosition( /* gradient */true );
			self.setColorToPreview( /* isGradient */true );
			self.setHuePosition( /* gradient */true );
			self.setAlpha( /* gradient */true );
			self.setAngle();
			self.colors.state = 'gradient';
			self.$colpick.addClass( 'type_gradient' );
			self.$colpick.removeClass( 'type_solid' );
		}

		// Bondable events
		self._events = {
			hide: self.hide.bind( self ),
			setPosition: self.setPosition.bind( self ),
			stop: self._stop.bind( self ),
			upAlpha: self.upAlpha.bind( self ),
			upAngle: self.upAngle.bind( self ),
			upHue: self.upHue.bind( self ),
			upSelector: self.upSelector.bind( self ),
		};

		// Specific events that can be fired in methods
		self._specEvents = {};

		// HUE movement handler
		self.$hueContainer
			.off( 'mousedown touchstart' )
			.on( 'mousedown touchstart', ( e ) => {
				e.preventDefault();
				self.downHue( e );
			} );

		self.$gradientHueContainer
			.off( 'mousedown touchstart' )
			.on( 'mousedown touchstart', ( e ) => {
				e.preventDefault();
				self.downHue( e, /* gradient */true );
			} );

		// Selector movement handler
		self.$curentColorBox
			.off( 'mousedown touchstart' )
			.on( 'mousedown touchstart', ( e ) => {
				e.preventDefault();
				self.downSelector( e );
			} );

		self.$gradientColorBox
			.off( 'mousedown touchstart' )
			.on( 'mousedown touchstart', ( e ) => {
				e.preventDefault();
				self.downSelector( e, /* gradient */true );
			} );

		// Alpha movement handler
		self.$alphaContainer
			.off( 'mousedown touchstart' )
			.on( 'mousedown touchstart', ( e ) => {
				e.preventDefault();
				self.downAlpha( e );
			} );

		self.$gradientAlphaContainer
			.off( 'mousedown touchstart' )
			.on( 'mousedown touchstart', ( e ) => {
				e.preventDefault();
				self.downAlpha( e, /* gradient */true );
			} );

		self.$angleContainer
			.off( 'mousedown touchstart' )
			.on( 'mousedown touchstart', ( e ) => {
				e.preventDefault();
				self.downAngle( e );
			} );

		// Make colpick visible on init
		self.$colpick.css( 'display', 'flex' );

		// Set colpick fixed position
		self.setPosition();

		// Recount colpick position on scroll
		self.$document.on( 'scroll', self._events.setPosition );

		// Recount colpick position on window resize
		self.$window.on( 'resize', self._events.setPosition );

		// Set radio button Solid/Gradient state
		self.$switchers
			.prop( 'checked', false )
			.filter( '[value="' + self.colors.state + '"]' )
			.prop( 'checked', true );

		// Solid/Gradient handler
		self.$document
			.off( 'change', '.usof-colpick input[name=usof-colpick-type]' )
			.on( 'change', '.usof-colpick input[name=usof-colpick-type]', ( e ) => {
				self._stop( e );
				let value = $( e.target ).closest( 'input' ).val();
				self.toggleGradient( value, /* setColor */true );
			} );

		// Hide colpick on blur
		self.$input
			.off( 'blur' )
			.on( 'blur', self._events.hide );

		// Don't close the colorpicker when click gradient switcher
		self.$switchersBox
			.off( 'mousedown' )
			.on( 'mousedown', self._events.stop );

		// Select text on first click
		self._timeout = $ush.timeout( () => {
			self.$input[0].select();
		}, 5 );
	}

	/**
	 * @type {{}} US ColorPicker functional method factory
	 */
	const api_usofColorPicker = $.extend( usofColorPicker.prototype, {

		/**
		 * Determines whether the specified value is css variable.
		 *
		 * @param {String} value The value.
		 * @return {Boolean} True if the specified value is css variable, False otherwise.
		 */
		isCssVariable: function( value ) {
			const self = this;
			if ( self.withColorList ) {
				return /^_([\dA-z\-_]+)$/.test( value ); // example: `_css_variable`
			}
			return false;
		},

		/**
		 * Determines whether the specified value is dynamic variable.
		 *
		 * @param {String} value The value.
		 * @return {Boolean} True if the specified value is dynamic variable, False otherwise.
		 */
		isDynamicVariable: function( value ) {
			const self = this;
			if ( self.withColorList ) {
				return /^{{([\dA-z\/\|\-_]+)}}$/.test( value ); // example: `{{dynamic_variable}}`
			}
			return false;
		},

		/**
		 * Kill current event
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_stop: function( e ) {
			e.preventDefault();
			e.stopPropagation();
		},

		/**
		 * Set the position
		 */
		setPosition: function() {
			const self = this;
			let coordinates = self.$input.offset(),
				bottomSpace = _document.body.clientHeight - ( coordinates.top - _window.pageYOffset ),
				calWrapH = self.$colpick.outerHeight(),
				top = self.colors.inputHeight,
				right = 'auto';

			if ( bottomSpace < calWrapH ) {
				top = - calWrapH;
			}

			if ( coordinates.left + self.colors.width * 2 > _document.body.clientWidth ) {
				right = 0;
			}

			self.$colpick.css( {
				'right': right,
				'top': top,
			} );
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 * @return {Boolean}
		 */
		downAngle: function( e ) {
			const self = this;
			let $target = $( e.target ),
				current, pageX, newVal;

			if ( $target.hasClass( 'usof-colpick-angle-selector' ) ) {
				$target = $target.parent();
			}
			current = {
				left: $target.offset().left,
			};

			/**
			 * Event wrapper function
			 *
			 * @param {Event} ev The Event interface represents an event which takes place in the DOM
			 */
			self._specEvents.moveAngle = ( ev ) => {
				self.moveAngle( ev, current );
			};

			self.$document
				.on( 'mouseup touchend', current, self._events.upAngle )
				.on( 'mousemove touchmove', self._specEvents.moveAngle );

			pageX = ( e.type == 'touchstart' )
				? e.originalEvent.changedTouches[ 0 ].pageX
				: e.pageX;
			newVal = parseInt( 360 * ( pageX - current.left ) / self.colors.angle, 10 );
			self.colors.gradient.angle = newVal;

			self.change();
			return false;
		},

		/**
		 * Detach angle event listeners
		 *
		 * @event handler
		 * @return {Boolean}
		 */
		upAngle: function() {
			const self = this;
			self.$document
				.off( 'mouseup touchend', self._events.upAngle )
				.off( 'mousemove touchmove', self._specEvents.moveAngle || $.noop );
			return false;
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 * @param {{}} current The current start data
		 * @return {Boolean}
		 */
		moveAngle: function( e, current ) {
			const self = this;
			let pageX = ( e.type == 'touchstart' )
				? e.originalEvent.changedTouches[ 0 ].pageX
				: e.pageX;

			let newVal = parseInt( 360 * ( pageX - current.left ) / self.colors.angle, 10 );
			if ( newVal < 0 ) {
				newVal = 0
			} else if ( newVal > 360 ) {
				newVal = 360;
			}

			newVal = self.round2precision( newVal, 5 );
			self.colors.gradient.angle = newVal;

			self.change();
			return false;
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 * @param {String} gradient The gradient
		 * @return {Boolean}
		 */
		downSelector: function( e, gradient ) {
			const self = this;
			let pageX, pageY,
				current = {
					pos: gradient
						? self.$gradientColorBox.offset()
						: self.$curentColorBox.offset(),
					number: gradient
						? 'second'
						: 'first',
				};

			/**
			 * Event wrapper function
			 *
			 * @param {Event} ev The Event interface represents an event which takes place in the DOM
			 */
			self._specEvents.moveSelector = ( ev ) => {
				self.moveSelector( ev, current, gradient );
			};

			self.$document
				.on( 'mouseup touchend', current, self._events.upSelector )
				.on( 'mousemove touchmove', self._specEvents.moveSelector );

			if ( e.type == 'touchstart' ) {
				pageX = e.originalEvent.changedTouches[ 0 ].pageX;
				pageY = e.originalEvent.changedTouches[ 0 ].pageY;
			} else {
				pageX = e.pageX;
				pageY = e.pageY;
			}

			self.colors.color[ current.number ].hsba.b = parseInt( 100 * ( self.colors.height - ( pageY - current.pos.top ) ) / self.colors.height, 10 );
			self.colors.color[ current.number ].hsba.s = parseInt( 100 * ( pageX - current.pos.left ) / self.colors.height, 10 );

			self.change( gradient );
			return false;
		},

		/**
		 * Detach selector event listeners
		 *
		 * @event handler
		 * @return {Boolean}
		 */
		upSelector: function() {
			const self = this;
			self.$document
				.off( 'mouseup touchend', self._events.upSelector )
				.off( 'mousemove touchmove', self._specEvents.moveSelector || $.noop );
			return false;
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 * @param {{}} current The current
		 * @param {String} gradient The gradient
		 * @return {Boolean}
		 */
		moveSelector: function( e, current, gradient ) {
			const self = this;
			let pageX, pageY;
			if ( e.type == 'touchmove' ) {
				pageX = e.originalEvent.changedTouches[ 0 ].pageX;
				pageY = e.originalEvent.changedTouches[ 0 ].pageY;
			} else {
				pageX = e.pageX;
				pageY = e.pageY;
			}

			self.colors.color[ current.number ].hsba.b = parseInt( 100 * ( self.colors.height - max( 0, min( self.colors.height, ( pageY - current.pos.top ) ) ) ) / self.colors.height, 10 );
			self.colors.color[ current.number ].hsba.s = parseInt( 100 * ( max( 0, min( self.colors.height, ( pageX - current.pos.left ) ) ) ) / self.colors.height, 10 );

			self.change( gradient );
			return false;
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 * @param {String} gradient The gradient
		 * @return {Boolean}
		 */
		downHue: function( e, gradient ) {
			const self = this;
			let $target = $( e.target ),
				current, pageY, newVal;

			if ( $target.hasClass( 'usof-colpick-hue-selector' ) ) {
				$target = $target.parent();
			}

			current = {
				top: $( $target ).offset().top,
				number: gradient ? 'second' : 'first'
			};

			/**
			 * Event wrapper function
			 *
			 * @param {Event} ev The Event interface represents an event which takes place in the DOM
			 */
			self._specEvents.moveHue = ( ev ) => {
				self.moveHue( ev, current, gradient );
			};

			self.$document
				.on( 'mouseup touchend', current, self._events.upHue )
				.on( 'mousemove touchmove', self._specEvents.moveHue );

			pageY = ( e.type == 'touchstart' )
				? e.originalEvent.changedTouches[ 0 ].pageY
				: e.pageY;
			newVal = parseInt( 360 * ( self.colors.height - ( pageY - current.top ) ) / self.colors.height, 10 );

			self.colors.color[ current.number ].hsba.h = newVal;

			self.change( gradient, /* setColor */true );
			return false;
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 * @param {{}} data The data
		 * @param {String} gradient The gradient
		 * @return {Boolean}
		 */
		moveHue: function( e, data, gradient ) {
			const self = this;
			let pageY = ( e.type == 'touchmove' )
					? e.originalEvent.changedTouches[ 0 ].pageY
					: e.pageY,
				newVal = parseInt( 360 * ( self.colors.height - max( 0, min( self.colors.height, ( pageY - data.top ) ) ) ) / self.colors.height, 10 );

			self.colors.color[ data.number ].hsba.h = newVal;

			self.change( gradient, /* setColor */true );
			return false;
		},

		/**
		 * Detach hue event listeners
		 *
		 * @event handler
		 * @return {Boolean}
		 */
		upHue: function() {
			const self = this;
			self.$document
				.off( 'mouseup touchend', self._events.upHue )
				.off( 'mousemove touchmove', self._specEvents.moveHue || $.noop );
			return false;
		},

		/**
		 * Set the angle
		 *
		 * @return {Boolean}
		 */
		setAngle: function() {
			const self = this;
			if ( self.isEmptyObject( self.colors.gradient ) ) {
				self.colors.gradient = { angle: 90 };
				return false;
			}
			let angle = self.colors.gradient.angle
				? parseInt( self.colors.gradient.angle, 10 )
				: 0;
			if ( angle >= 0 && angle <= 360 ) {
				angle = angle * self.colors.angle / 360;
			} else {
				return false;
			}

			self.$angle.css( 'left', angle );
		},

		/**
		 * Set the current color
		 *
		 * @param {Boolean} isGradient
		 */
		setColorToPreview: function( isGradient ) {
			const self = this;
			if ( isGradient ) {
				self.$gradientColorBox.css( 'backgroundColor',
					self.hsbaToHex( {
						h: self.colors.color.second.hsba.h,
						s: 100,
						b: 100
					} )
				);
			}
			self.$curentColorBox.css( 'backgroundColor',
				self.hsbaToHex( {
					h: self.colors.color.first.hsba.h,
					s: 100,
					b: 100
				} )
			);
		},

		/**
		 * Set the alpha
		 *
		 * @param {String} gradient The gradient
		 */
		setAlpha: function( gradient ) {
			const self = this;
			const rgba = self.colors.color.first.rgba;
			let hsba = self.colors.color.first.hsba,
				rgbaG, alphaStyle, alphaStyleG;

			if ( hsba.a === _undefined ) {
				hsba.a = 1.;
			}

			// Create Alpha style
			alphaStyle = 'background: linear-gradient(to bottom, rgb(' + rgba.r + ', ' + rgba.g + ', ' + rgba.b + ') 0%, ';
			alphaStyle += 'rgba(' + rgba.r + ', ' + rgba.g + ', ' + rgba.b + ', 0) 100%)';

			self.$alphaContainer.attr( 'style', alphaStyle );

			if ( gradient ) {
				rgbaG = self.colors.color.second.rgba;
				alphaStyleG = 'background: linear-gradient(to bottom, rgb(' + rgbaG.r + ', ' + rgbaG.g + ', ' + rgbaG.b + ') 0%, ';
				alphaStyleG += 'rgba(' + rgbaG.r + ', ' + rgbaG.g + ', ' + rgbaG.b + ', 0) 100%)';

				// Set Alpha background
				self.$gradientAlphaContainer.attr( 'style', alphaStyleG );
				// Set Alpha position
				self.$gradientAlphaArr.css( 'top', parseInt( self.colors.height * ( 1. - self.colors.color.second.hsba.a ) ) );
			}
			self.$alphaArr.css( 'top', parseInt( self.colors.height * ( 1. - self.colors.color.first.hsba.a ) ) );
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 * @param {String} gradient The gradient
		 * @return {Boolean}
		 */
		downAlpha: function( e, gradient ) {
			const self = this;
			let $target = $( e.target ),
				current, pageY, alpha;

			if ( $target.hasClass( 'usof-colpick-alpha-selector' ) ) {
				$target = $target.parent();
			}

			current = {
				top: $target.offset().top,
				number: gradient ? 'second' : 'first',
			};

			/**
			 * Event wrapper function
			 *
			 * @param {Event} ev The Event interface represents an event which takes place in the DOM
			 */
			self._specEvents.moveAlpha = ( ev ) => {
				self.moveAlpha( ev, current, gradient );
			};

			self.$document
				.on( 'mouseup touchend', current, self._events.upAlpha )
				.on( 'mousemove touchmove', self._specEvents.moveAlpha );

			pageY = ( e.type == 'touchstart' )
				? e.originalEvent.changedTouches[ 0 ].pageY
				: e.pageY;
			alpha = ( self.colors.height - ( pageY - current.top ) ) / self.colors.height;

			self.colors.color[ current.number ].rgba.a = alpha;
			self.colors.color[ current.number ].hsba.a = alpha;

			self.change( gradient );
			return false;
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 * @param {{}} current The current
		 * @param {String} gradient The gradient
		 * @return {Boolean}
		 */
		moveAlpha: function( e, current, gradient ) {
			const self = this;
			let pageY = ( e.type == 'touchmove' )
					? e.originalEvent.changedTouches[ 0 ].pageY
					: e.pageY,
				alpha = ( self.colors.height - ( pageY - current.top ) ) / self.colors.height;

			if ( alpha > 1 ) {
				alpha = 1;
			} else if ( alpha < 0 ) {
				alpha = 0;
			}
			alpha = self.round2precision( alpha, 0.05 );
			alpha = parseFloat( alpha ).toFixed( 2 );
			self.colors.color[ current.number ].rgba.a = alpha;
			self.colors.color[ current.number ].hsba.a = alpha;
			self.change( gradient );
			return false;
		},

		/**
		 * Detach alpha event listeners
		 *
		 * @event handler
		 * @return {Boolean}
		 */
		upAlpha: function() {
			const self = this;
			self.$document
				.off( 'mouseup touchend', self._events.upAlpha )
				.off( 'mousemove touchmove', self._specEvents.moveAlpha || $.noop );
			return false;
		},

		/**
		 * @param {String} gradient The gradient
		 * @param {Boolean} setColor The set color
		 */
		change: function( gradient, setColor ) {
			const self = this;
			self.colors.color.first.rgba = self.hsbaToRgba( self.colors.color.first.hsba );
			self.colors.color.first.hex = self.hsbaToHex( self.colors.color.first.hsba );

			if ( ! self.isEmptyObject( self.colors.color.second ) ) {
				self.colors.color.second.rgba = self.hsbaToRgba( self.colors.color.second.hsba );
				self.colors.color.second.hex = self.hsbaToHex( self.colors.color.second.hsba );
			}
			self.setHuePosition( gradient );
			if ( setColor ) {
				self.setColorToPreview( gradient );
			}
			self.setAngle();
			self.setDotPosition( gradient );
			self.setAlpha( gradient );
			self.setColor();

			// Pass colors object to USOF via onChange callback
			self.colors.onChange.apply( self.colors, [ self.colors ] );
		},

		/**
		 * Toggle gradient
		 *
		 * @param {String} state The state
		 * @param {Boolean} setColor The set color
		 */
		toggleGradient: function( state, setColor ) {
			const self = this;
			const hasGradient = ( state == 'gradient' );
			if ( state === 'solid' ) {
				self.$colpick
					.removeClass( 'type_gradient' )
					.addClass( 'type_solid' );
				self.colors.color.second = {};
				self.colors.gradient = {};

			} else if ( hasGradient ) {
				self.$colpick
					.addClass( 'type_gradient' )
					.removeClass( 'type_solid' );

				if (
					self.isEmptyObject( self.colors.color.second.hsba )
					|| self.isEmptyObject( self.colors.color.second.rgba )
				) {
					self.colors.color.second.hsba = self.colors.initialSecondColor.hsba;
					self.colors.color.second.rgba = self.colors.initialSecondColor.rgba;
				}

				if ( self.isEmptyObject( self.colors.gradient ) ) {
					self.colors.gradient = { angle: 90 };
				}
			}

			self.colors.state = state;
			self.$switchers
				.filter( '[value="' + self.colors.state + '"]' )
				.prop( 'checked', 'checked' );

			self.change( hasGradient, setColor );
		},

		/**
		 * Hide color picker
		 */
		hide: function() {
			const self = this;
			self.$colpick
				.css( 'display', 'none' )
				.removeClass( 'type_gradient' );

			if ( self._timeout ) {
				$ush.clearTimeout( self._timeout );
			}

			let value = self.$input.val();
			if ( self.colors.initialColor != value ) {
				self.$input.trigger( 'change' );
			}

			// Detach event listeners
			self.$hueContainer.off( 'mousedown touchstart' );
			self.$gradientHueContainer.off( 'mousedown touchstart' );
			self.$curentColorBox.off( 'mousedown touchstart' );
			self.$gradientColorBox.off( 'mousedown touchstart' );
			self.$alphaContainer.off( 'mousedown touchstart' );
			self.$gradientAlphaContainer.off( 'mousedown touchstart' );
			self.$angleContainer.off( 'mousedown touchstart' );
			self.$switchers.off( 'change' );
			self.$input.off( 'blur' ).trigger( 'blur' );

			// Delete cloned element
			self.$colpick.remove();

			// Reset selected text and trigger blur
			self.$input[0].selectionStart = value.length;
			self.$input[0].blur();

			self.$input.removeClass( 'active' );
		},

		/**
		 * Determines whether the specified value is valid color
		 *
		 * @param {{}|String} value The value
		 * @return {Boolean} True if the specified value is valid color, False otherwise
		 */
		colorIsValid: function( value ) {
			const self = this;
			let gradient, valueG2, valueG1;
			// Check color and fill HSBa in colors object
			if ( typeof value == 'string' ) {
				if ( self.colorNameToHex( value ) ) {
					value = self.hexToHsba( self.colorNameToHex( value ) );
				} else if ( self.isGradient( value ) ) {
					gradient = self.gradientParser( value );
					value = self.hexToHsba( gradient.hex );
					self.colors.gradient = gradient;
				} else if ( value == 'transparent' ) {
					value = {
						h: 360,
						s: 0,
						b: 0,
						a: 0,
					}
				} else {
					value = self.hexToHsba( self.normalizeHex( value ) );
				}
			} else if ( value.r != _undefined && value.g != _undefined && value.b != _undefined ) {
				value = self.rgbaToHsba( value );
			} else {
				return false;
			}

			if ( gradient ) {
				self.colors.state = 'gradient';

				valueG1 = gradient.colors[ 0 ];
				valueG1 = self.value2Hsba( valueG1 );
				self.colors.color.first.hsba = valueG1;
				self.colors.color.first.hex = self.hsbaToHex( valueG1 );
				self.colors.color.first.rgba = self.hsbaToRgba( valueG1 );

				self.colors.color.first.dot = {
					left: parseInt( self.colors.height * valueG1.s / 100, 10 ),
					top: parseInt( self.colors.height * ( 100 - valueG1.b ) / 100, 10 ),
				};

				valueG2 = gradient.colors[ 1 ];
				valueG2 = self.value2Hsba( valueG2 );
				self.colors.color.second.hsba = valueG2;
				self.colors.color.second.hex = self.hsbaToHex( valueG2 );
				self.colors.color.second.rgba = self.hsbaToRgba( valueG2 );

				self.colors.color.second.dot = {
					left: parseInt( self.colors.height * valueG2.s / 100, 10 ),
					top: parseInt( self.colors.height * ( 100 - valueG2.b ) / 100, 10 ),
				};

			} else {
				self.colors.state = 'solid';
				self.colors.color.first.hsba = value;
				self.colors.color.first.hex = self.hsbaToHex( value );
				self.colors.color.first.rgba = self.hsbaToRgba( value );

				// Detect dot coordinates
				self.colors.color.first.dot = {
					left: parseInt( self.colors.height * value.s / 100, 10 ),
					top: parseInt( self.colors.height * ( 100 - value.b ) / 100, 10 ),
				};
			}

			return true;
		},

		/**
		 * Set the hue position
		 *
		 * @param {String} gradient The gradient
		 */
		setHuePosition: function( gradient ) {
			const self = this;
			// Set hue on init
			if ( gradient ) {
				self.$hueArr2.css( 'top', self.colors.height - self.colors.height * self.colors.color.second.hsba.h / 360 );
			}
			self.$hueArr.css( 'top', self.colors.height - self.colors.height * self.colors.color.first.hsba.h / 360 );
		},

		/**
		 * Set the round selector position
		 *
		 * @param {Boolean} gradient The gradient
		 */
		setDotPosition: function( gradient ) {
			const self = this;
			if ( gradient ) {
				self.$gradientDot.css( {
					top: parseInt( self.colors.height * ( 100 - self.colors.color.second.hsba.b ) / 100, 10 ),
					left: parseInt( self.colors.height * self.colors.color.second.hsba.s / 100, 10 ),
				} );
			}

			self.$selector.css( {
				top: parseInt( self.colors.height * ( 100 - self.colors.color.first.hsba.b ) / 100, 10 ),
				left: parseInt( self.colors.height * self.colors.color.first.hsba.s / 100, 10 ),
			} );
		},

		/**
		 * Convert value to HSBa object
		 *
		 * @param {{}|String} value The color value
		 * @return {{}} Returns an HSBa object
		 */
		value2Hsba: function( value ) {
			const self = this;
			if ( typeof value == 'string' ) {
				if ( self.colorNameToHex( value ) ) {
					value = self.hexToHsba( self.colorNameToHex( value ) );
				} else if ( value.indexOf( 'rgb' ) > 0 ) {
					value = self.rgbaToHsba( value );
				} else {
					value = self.hexToHsba( value );
				}
			} else if ( value.r != _undefined && value.g != _undefined && value.b != _undefined ) {
				value = self.rgbaToHsba( value );
			}

			return value;
		},

		/**
		 * Convert HEX object to HSBa object
		 *
		 * @param {String} hex The hexadecimal
		 * @return {{}} Returns an HSBa object
		 */
		hexToHsba: function( hex ) {
			const self = this;
			return self.rgbaToHsba( self.hexToRgba( hex ) );
		},

		/**
		 * Convert HEX string to RGBa object
		 *
		 * @param {String} hex The hexadecimal
		 * @return {{}} Returns an RGBa object
		 */
		hexToRgba: function( hex ) {
			if ( hex.substr( 0, 5 ) == 'rgba(' ) {
				const parts = hex.substring( 5, hex.length - 1 ).split( ',' ).map( parseFloat );
				if ( parts.length == 4 ) {
					return {
						r: parts[0],
						g: parts[1],
						b: parts[2],
						a: parts[3]
					};
				}
			}
			if ( hex.length == 3 ) {
				hex = hex.charAt( 0 ) + hex.charAt( 0 ) + hex.charAt( 1 ) + hex.charAt( 0 ) + hex.charAt( 2 ) + hex.charAt( 2 );
			}
			hex = parseInt( ( ( hex.indexOf( '#' ) > - 1 ) ? hex.substring( 1 ) : hex ), 16 );
			return {
				r: hex >> 16,
				g: ( hex & 0x00FF00 ) >> 8,
				b: ( hex & 0x0000FF ),
				a: 1.
			};
		},

		/**
		 * Convert RGBa object to HSBa object
		 *
		 * @param {{}} rgba The rgba object
		 * @return {{}} Returns an HSBa object
		 */
		rgbaToHsba: function( rgba ) {
			let hsba = { h: 0, s: 0, b: 0 },
				_max = max( rgba.r, rgba.g, rgba.b ),
				delta = _max - min( rgba.r, rgba.g, rgba.b );

			hsba.b = _max;
			hsba.s = _max != 0 ? 255 * delta / _max : 0;
			if ( hsba.s != 0 ) {
				if ( rgba.r == _max ) {
					hsba.h = ( rgba.g - rgba.b ) / delta;
				} else if ( rgba.g == _max ) {
					hsba.h = 2 + ( rgba.b - rgba.r ) / delta;
				} else {
					hsba.h = 4 + ( rgba.r - rgba.g ) / delta;
				}
			} else {
				hsba.h = - 1;
			}
			hsba.h *= 60;
			if ( hsba.h < 0 ) {
				hsba.h += 360;
			}
			hsba.s *= 100 / 255;
			hsba.b *= 100 / 255;
			hsba.a = rgba.a;

			return hsba;
		},

		/**
		 * Convert HSBa object to HEX string
		 *
		 * @param {{}} hsba The hsba object
		 * @return {String} Returns color values in HEX format
		 */
		hsbaToHex: function( hsba ) {
			const self = this;
			return self.rgbaToHex( self.hsbaToRgba( hsba ) );
		},

		/**
		 * Convert RGBa object to HEX string
		 *
		 * @param {{}} rgba The rgba object
		 * @return {String} Returns color values in HEX format
		 */
		rgbaToHex: function( rgba ) {
			return '#' + Object.values( $.isPlainObject( rgba ) ? rgba : {} )
				.slice( 0, 3 )
				.map( ( value ) => { return value <= 255 ? ( '0' + parseInt( value, 10 ).toString( 16 ) ).slice( -2 ) : 'ff' } )
				.join( '' );
		},

		/**
		 * Convert HSBa object to RRBa object
		 *
		 * @param {{}} hsba The HSBa object
		 * @return {{}} Returns an RGBa object
		 */
		hsbaToRgba: function( hsba ) {
			let rgb = {},
				h = hsba.h,
				s = hsba.s * 255 / 100,
				v = hsba.b * 255 / 100;

			if ( s === 0 ) {
				rgb.r = rgb.g = rgb.b = v;
			} else {
				var t1 = v,
					t2 = ( 255 - s ) * v / 255,
					t3 = ( t1 - t2 ) * ( h % 60 ) / 60;
				if ( h === 360 ) {
					h = 0;
				}
				if ( h < 60 ) {
					rgb.r = t1;
					rgb.b = t2;
					rgb.g = t2 + t3
				} else if ( h < 120 ) {
					rgb.g = t1;
					rgb.b = t2;
					rgb.r = t1 - t3
				} else if ( h < 180 ) {
					rgb.g = t1;
					rgb.r = t2;
					rgb.b = t2 + t3
				} else if ( h < 240 ) {
					rgb.b = t1;
					rgb.r = t2;
					rgb.g = t1 - t3
				} else if ( h < 300 ) {
					rgb.b = t1;
					rgb.g = t2;
					rgb.r = t2 + t3
				} else if ( h < 360 ) {
					rgb.r = t1;
					rgb.g = t2;
					rgb.b = t1 - t3
				} else {
					rgb.r = 0;
					rgb.g = 0;
					rgb.b = 0
				}
			}
			return {
				r: round( rgb.r ),
				g: round( rgb.g ),
				b: round( rgb.b ),
				a: hsba.a
			};
		},

		/**
		 * Get a list of values from a gradient
		 *
		 * @param {String} color The color
		 * @return {[]|Boolean} Returns an array if successful, otherwise the boolean value is False
		 */
		gradientParser: function( color ) {
			const self = this;
			let matches;
			if ( matches = /^linear-gradient\(([\D\d]+)\);?$/.exec( color ) ) {
				var gradient = matches[ 1 ].split( ',' ),
					directions = ['to', 'top', 'right', 'bottom', 'left', 'turn', 'deg'],
					index,
					colors = {
						colors: [],
						gradient: color,
					};

				// Find gradient direction
				for ( var d = 0; d < directions.length; d ++ ) {
					index = gradient[ 0 ].indexOf( directions[ d ] );
					if ( index !== - 1 ) {
						colors.direction = gradient[ 0 ];
						if ( directions[ d ] === 'deg' ) {
							colors.angle = parseInt( gradient[ 0 ], 10 );
						}
					}
				}

				// Find color values
				for ( var i = 0; i < gradient.length; i ++ ) {
					if ( gradient[ i ].indexOf( '%' ) !== - 1 ) {
						// Remove percents to work only with colors
						gradient[ i ] = gradient[ i ].replace( /^(.+)(\s[0-9]+%)/, '$1' );
					}
					gradient[ i ] = $ush.toLowerCase( gradient[ i ] ).trim();

					var hex = gradient[ i ].indexOf( '#' ),
						rgb = gradient[ i ].indexOf( 'rgb(' ),
						rgba = gradient[ i ].indexOf( 'rgba(' );

					// Look for hex values
					if ( hex !== - 1 ) {
						var normalizedHex = self.normalizeHex( gradient[ i ].replace( '#', '' ) );
						colors.colors.push( normalizedHex );
					} else if ( rgb !== - 1 ) {
						// Look for RGB
						var rgbColor = {};
						rgbColor.r = parseInt( gradient[ i ].replace( 'rgb(', '' ).trim() );
						rgbColor.g = parseInt( gradient[ i + 1 ].trim() );
						rgbColor.b = parseInt( gradient[ i + 2 ].replace( ')', '' ).trim() );
						colors.colors.push( rgbColor );
						// Skip the next values since they are already added
						i += 2;
					} else if ( rgba !== - 1 ) {
						// Look for RGBa
						var rgbaColor = {};
						rgbaColor.r = parseInt( gradient[ i ].replace( 'rgba(', '' ).trim() );
						rgbaColor.g = parseInt( gradient[ i + 1 ].trim() );
						rgbaColor.b = parseInt( gradient[ i + 2 ].trim() );
						rgbaColor.a = parseFloat( gradient[ i + 3 ].trim().replace( ')', '' ).trim() );
						colors.colors.push( rgbaColor );
						// Skip the next values since they are already added
						i += 3;
					} else if ( matches = /^[a-z0-9]*$/.exec( gradient[ i ] ) ) {
						if ( gradient[ i ] !== colors.direction ) {
							colors.colors.push( gradient[ i ] );
						}
					}
				}

				if ( typeof colors.colors[ 0 ] == 'string' ) {
					if ( colors.colors[ 0 ].indexOf( '#' ) !== - 1 ) {
						colors.hex = self.normalizeHex( colors.colors[ 0 ].replace( '#', '' ) );
					} else if ( self.colorNameToHex( colors.colors[ 0 ] ) ) {
						colors.hex = self.colorNameToHex( colors.colors[ 0 ] );
					} else {
						// Maybe it is not a color at all, so make it white
						colors.hex = '#ffffff';
					}
				} else {
					// Can be returned as rgba string if rgba object is passed
					colors.hex = self.rgbaToHex( colors.colors[ 0 ] );
				}
				return colors;
			}
			return false;
		},

		/**
		 * Determines whether the specified value is gradient
		 *
		 * @param {String} value The value
		 * @return {Boolean} True if the specified value is gradient, False otherwise
		 */
		isGradient: function( value ) {
			return value && /^linear-gradient\(.+\)$/.test( value );
		},

		/**
		 * Get hex by color name
		 *
		 * @param {String} colorName The color name
		 * @return {String|Boolean} Returns a hex on success, otherwise the boolean value is False
		 */
		colorNameToHex: function( colorName ) {
			if ( ! colorName ) {
				return false;
			}

			/**
			 * @type {{}} List of color names and hexes in key => value format
			 */
			const colorNames = {
				'aliceblue': '#f0f8ff',
				'antiquewhite': '#faebd7',
				'aqua': '#00ffff',
				'aquamarine': '#7fffd4',
				'azure': '#f0ffff',
				'beige': '#f5f5dc',
				'bisque': '#ffe4c4',
				'black': '#000000',
				'blanchedalmond': '#ffebcd',
				'blue': '#0000ff',
				'blueviolet': '#8a2be2',
				'brown': '#a52a2a',
				'burlywood': '#deb887',
				'cadetblue': '#5f9ea0',
				'chartreuse': '#7fff00',
				'chocolate': '#d2691e',
				'coral': '#ff7f50',
				'cornflowerblue': '#6495ed',
				'cornsilk': '#fff8dc',
				'crimson': '#dc143c',
				'cyan': '#00ffff',
				'darkblue': '#00008b',
				'darkcyan': '#008b8b',
				'darkgoldenrod': '#b8860b',
				'darkgray': '#a9a9a9',
				'darkgreen': '#006400',
				'darkkhaki': '#bdb76b',
				'darkmagenta': '#8b008b',
				'darkolivegreen': '#556b2f',
				'darkorange': '#ff8c00',
				'darkorchid': '#9932cc',
				'darkred': '#8b0000',
				'darksalmon': '#e9967a',
				'darkseagreen': '#8fbc8f',
				'darkslateblue': '#483d8b',
				'darkslategray': '#2f4f4f',
				'darkturquoise': '#00ced1',
				'darkviolet': '#9400d3',
				'deeppink': '#ff1493',
				'deepskyblue': '#00bfff',
				'dimgray': '#696969',
				'dodgerblue': '#1e90ff',
				'firebrick': '#b22222',
				'floralwhite': '#fffaf0',
				'forestgreen': '#228b22',
				'fuchsia': '#ff00ff',
				'gainsboro': '#dcdcdc',
				'ghostwhite': '#f8f8ff',
				'gold': '#ffd700',
				'goldenrod': '#daa520',
				'gray': '#808080',
				'green': '#008000',
				'greenyellow': '#adff2f',
				'honeydew': '#f0fff0',
				'hotpink': '#ff69b4',
				'indianred': '#cd5c5c',
				'indigo': '#4b0082',
				'ivory': '#fffff0',
				'khaki': '#f0e68c',
				'lavender': '#e6e6fa',
				'lavenderblush': '#fff0f5',
				'lawngreen': '#7cfc00',
				'lemonchiffon': '#fffacd',
				'lightblue': '#add8e6',
				'lightcoral': '#f08080',
				'lightcyan': '#e0ffff',
				'lightgoldenrodyellow': '#fafad2',
				'lightgrey': '#d3d3d3',
				'lightgreen': '#90ee90',
				'lightpink': '#ffb6c1',
				'lightsalmon': '#ffa07a',
				'lightseagreen': '#20b2aa',
				'lightskyblue': '#87cefa',
				'lightslategray': '#778899',
				'lightsteelblue': '#b0c4de',
				'lightyellow': '#ffffe0',
				'lime': '#00ff00',
				'limegreen': '#32cd32',
				'linen': '#faf0e6',
				'magenta': '#ff00ff',
				'maroon': '#800000',
				'mediumaquamarine': '#66cdaa',
				'mediumblue': '#0000cd',
				'mediumorchid': '#ba55d3',
				'mediumpurple': '#9370d8',
				'mediumseagreen': '#3cb371',
				'mediumslateblue': '#7b68ee',
				'mediumspringgreen': '#00fa9a',
				'mediumturquoise': '#48d1cc',
				'mediumvioletred': '#c71585',
				'midnightblue': '#191970',
				'mintcream': '#f5fffa',
				'mistyrose': '#ffe4e1',
				'moccasin': '#ffe4b5',
				'navajowhite': '#ffdead',
				'navy': '#000080',
				'oldlace': '#fdf5e6',
				'olive': '#808000',
				'olivedrab': '#6b8e23',
				'orange': '#ffa500',
				'orangered': '#ff4500',
				'orchid': '#da70d6',
				'palegoldenrod': '#eee8aa',
				'palegreen': '#98fb98',
				'paleturquoise': '#afeeee',
				'palevioletred': '#d87093',
				'papayawhip': '#ffefd5',
				'peachpuff': '#ffdab9',
				'peru': '#cd853f',
				'pink': '#ffc0cb',
				'plum': '#dda0dd',
				'powderblue': '#b0e0e6',
				'purple': '#800080',
				'rebeccapurple': '#663399',
				'red': '#ff0000',
				'rosybrown': '#bc8f8f',
				'royalblue': '#4169e1',
				'saddlebrown': '#8b4513',
				'salmon': '#fa8072',
				'sandybrown': '#f4a460',
				'seagreen': '#2e8b57',
				'seashell': '#fff5ee',
				'sienna': '#a0522d',
				'silver': '#c0c0c0',
				'skyblue': '#87ceeb',
				'slateblue': '#6a5acd',
				'slategray': '#708090',
				'snow': '#fffafa',
				'springgreen': '#00ff7f',
				'steelblue': '#4682b4',
				'tan': '#d2b48c',
				'teal': '#008080',
				'thistle': '#d8bfd8',
				'tomato': '#ff6347',
				'turquoise': '#40e0d0',
				'violet': '#ee82ee',
				'wheat': '#f5deb3',
				'white': '#ffffff',
				'whitesmoke': '#f5f5f5',
				'yellow': '#ffff00',
				'yellowgreen': '#9acd32'
			};

			return colorNames[ colorName.toLowerCase() ] || false;
		},

		/**
		 * Normalizes HEX value
		 *
		 * @param {String} hex The hexadecimal
		 * @return {String} Returns the correct color value in HEX format
		 */
		normalizeHex: function( hex ) {
			hex = hex.replace( '#', '' );
			let hashString;
			if ( hex.length === 3 ) {
				hex = '#' + hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ];
			} else if ( hex.length <= 6 ) {
				hashString = hex.split( '' );
				while ( hashString.length < 6 ) {
					hashString.unshift( '0' );
				}
				hex = '#' + hashString.join( '' );
			}

			return hex;
		},

		/**
		 * Rounding to 2 characters
		 *
		 * @param {Number} x
		 * @param {Number} precision The precision
		 * @return {Number}
		 */
		round2precision: function( x, precision ) {
			const y = + x + ( precision === _undefined ? 0.5 : precision / 2 );
			return y - ( y % ( precision === _undefined ? 1 : + precision ) );
		},

		/**
		 * Determines whether the specified object is empty object
		 *
		 * @param {{}} obj The object
		 * @return {Boolean} True if the specified object is empty object, False otherwise
		 */
		isEmptyObject: function( obj ) {
			for ( const key in obj ) {
				if ( obj.hasOwnProperty( key ) ) {
					return false;
				}
			}
			return true;
		},

		/**
		 * Write color to input
		 */
		setColor: function() {
			const self = this;
			let color, firstColor, secondColor, rgbaS, rgbaF;

			if ( ! self.isEmptyObject( self.colors.color.second ) ) {
				// Create linear-gradient
				if ( self.colors.color.second.hsba.a < 1 ) {
					rgbaS = self.hsbaToRgba( self.colors.color.second.hsba );
					secondColor = 'rgba(' + rgbaS.r + ',' + rgbaS.g + ',' + rgbaS.b + ',' + rgbaS.a + ')';
				} else {
					secondColor = self.hsbaToHex( self.colors.color.second.hsba );
				}

				if ( self.colors.color.first.hsba.a < 1 ) {
					rgbaF = self.hsbaToRgba( self.colors.color.first.hsba );
					firstColor = 'rgba(' + rgbaF.r + ',' + rgbaF.g + ',' + rgbaF.b + ',' + rgbaF.a + ')';
				} else {
					firstColor = self.hsbaToHex( self.colors.color.first.hsba );
				}

				color = 'linear-gradient(' + self.colors.gradient.angle + 'deg,' + firstColor + ',' + secondColor + ')';
			} else {
				// Create single color
				if ( self.colors.color.first.hsba.a < 1 ) {
					rgbaF = self.hsbaToRgba( self.colors.color.first.hsba );
					color = 'rgba(' + rgbaF.r + ',' + rgbaF.g + ',' + rgbaF.b + ',' + rgbaF.a + ')';
				} else {
					color = self.hsbaToHex( self.colors.color.first.hsba );
				}
			}

			if ( self.colors.initialColor !== 'color' ) {
				self.$input.val( color ).trigger( 'change' ); // Trigger change event to change preview according to input value
			}
		},
	} );

	$.fn.usofColorPicker = function( options ) {
		return this.each( function() {
			if ( $ush.toLowerCase( this.tagName ) === 'input' ) {
				$( this ).data( 'usofColorPicker', new usofColorPicker( this, options ) );
			}
		} );
	};

	/**
	 * @type {{}} Export global API
	 */
	_window.usofColorPicker = {
		colorNameToHex: api_usofColorPicker.colorNameToHex,
		gradientParser: api_usofColorPicker.gradientParser,
		hexToRgba: api_usofColorPicker.hexToRgba,
		hide: api_usofColorPicker.hide,
		isGradient: api_usofColorPicker.isGradient,
		colorIsValid: api_usofColorPicker.colorIsValid,
		normalizeHex: api_usofColorPicker.normalizeHex,
		rgbaToHex: api_usofColorPicker.rgbaToHex,
		isCssVariable: api_usofColorPicker.isCssVariable,
		isDynamicVariable: api_usofColorPicker.isDynamicVariable,
	};

}( jQuery );
