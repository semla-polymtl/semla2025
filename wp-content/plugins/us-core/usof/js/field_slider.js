/**
 * USOF Field: Slider with units.
 */
! function( $, undefined ) {

	// Private variables that are used only in the context of this function, it is necessary to optimize the code.
	var _document = document,
		_window = window;

	// Math API
	var abs = Math.abs,
		max = Math.max,
		min = Math.min,
		round = Math.round;

	var isEmptyObject = $.isEmptyObject,
		isPlainObject = $.isPlainObject,
		isUndefined = $ush.isUndefined;

	if ( isUndefined( _window.$usof ) ) {
		return;
	}

	/**
	 * @type {String} Values before editing in the field.
	 */
	var oldCurrentValue;

	/**
	 * @type {[]} Mouse and trackpad scroll events.
	 */
	var _mouseEvents = [ 'wheel', 'mousewheel', 'DOMMouseScroll' ];

	/**
	 * @type {{}} Data at the time of moving the box
	 */
	var _dragData = {};

	$usof.field[ 'slider' ] = {

		init: function( options ) {
			var self = this;

			// Variables
			var _defaultRangeSettings = {
				min: 0,
				max: 60,
				step: 1
			};
			self._unitsSettings = {};
			self.isFocused = false;

			// Elements
			self.$window = $( _window );
			self.$body = $( _document.body );
			self.$usofContainer = $( '.usof-container' );
			self.$slider = $( '.usof-slider', self.$row );
			self.$box = $( '.usof-slider-box', self.$slider );
			self.$range = $( '.usof-slider-range', self.$slider );
			self.$units = $( '.usof-slider-selector-unit', self.$slider );
			self.$unitSelector = $( '.usof-slider-selector input', self.$slider );

			// Get range settings for units
			if ( self.$slider.is( '[onclick]' ) ) {
				$.each( self.$slider[ 0 ].onclick() || {}, function( unit, options ) {
					options = $.extend( {}, _defaultRangeSettings, options );
					self._unitsSettings[ unit ] = options;
				} );
				self.$slider.removeAttr( 'onclick' );
			}
			if ( isEmptyObject( self._unitsSettings ) ) {
				self._unitsSettings[ 'px' ] = $ush.clone( _defaultRangeSettings );
			}

			/**
			 * @var {{}} Bondable events.
			*/
			self._events = {
				setResponsiveScreen: $ush.debounce( self._setResponsiveScreen.bind( self ), 1 ),
				selectedUnit: self._selectedUnit.bind( self ),
				blur: self._blur.bind( self ),
				focus: self._focus.bind( self ),
				keyup: self._keyup.bind( self ),
				mouseenter: self._mouseenter.bind( self ),
				mouseleave: self._mouseleave.bind( self ),
				mousewheel: self._mousewheel.bind( self ),
				dragmove: self._dragmove.bind( self ),
				dragstart: self._dragstart.bind( self ),
				dragstop: self._dragstop.bind( self ),
			};

			// Events
			self.$slider
				// Handler for receiving data at the start of the move and initialization of events
				.on( 'mousedown', '.usof-slider-box', self._events.dragstart )
				// Handler for selected a new unit
				.on( 'mousedown', '.usof-slider-selector-unit', self._events.selectedUnit );

			self.$unitSelector
				// Handler for the event of the cursor entering the area of the unit field
				.on( 'mouseenter', self._events.mouseenter )
				// Handler for the exit event of the cursor from the area of the unit field
				.on( 'mouseleave', self._events.mouseleave )
				// Handler for intercepting pressing the Enter
				.on( 'keyup', self._events.keyup )
				// Handler for unit field when get focus
				.on( 'focus', self._events.focus )
				// Handler for unit field on blur event
				.on( 'blur', self._events.blur );

			// Private events
			if ( self.hasResponsive() ) {
				self.on( 'setResponsiveState', self._events.setResponsiveScreen );
			}
		},

		/**
		 * Get unit data mask: `{value}{unit}`.
		 *
		 * @param {String} value The value.
		 * @return {{}} Returns an object containing a unit and an numeric value.
		 */
		getUnitData: function( value ) {
			var self = this, unitsSettings = self._unitsSettings;
			value += ''; // to string

			// Get unit and validate
			var unit = ( value.match( /^((-?\d+)(\.)?(\d+)?)([a-z\%]+)?$/ ) || [] )[ /* unit */5 ] || /* no units */'';
			if ( isUndefined( unitsSettings[ unit ] ) ) {
				unit = $ush.toString( Object.keys( unitsSettings )[ /* first unit */0 ] )
			}
			return {
				value: value.replace( /[^-?\d.]+/, '' ) || /* default */0,
				unit: unit
			}
		},

		/**
		 * Round value to desired length.
		 *
		 * @param {String} value The value.
		 * @return {Numeric} Returns values in decimal format.
		 */
		roundValue: function( value ) {
			var decimalValue = parseFloat( value ),
				decimalPart = $ush.toString( ( abs( value ) % 1 ).toFixed( 3 ) );

			// Decimal part has 1/100 part
			if ( decimalPart.charAt( 3 ) !== '' && decimalPart.charAt( 3 ) !== '0' ) {
				return decimalValue.toFixed( 2 );
			}
			// Decimal part has 1/10 part
			else if ( decimalPart.charAt( 2 ) !== '' && decimalPart.charAt( 2 ) !== '0' ) {
				return decimalValue.toFixed( 1 );
			}
			// Decimal part is less than 1/100 or it is just 0
			return decimalValue.toFixed( 0 );
		},

		/**
		 * Render a value to determine a unit.
		 *
		 * @param {String} value The value.
		 */
		renderValue: function( value ) {
			var self = this,
				unitData = self.getUnitData( value ),
				unit = unitData.unit,
				value = unitData.value;

			// Set current value
			self.$unitSelector.val( value + unit );

			// Select active unit
			self.$units
				.removeClass( 'active' )
				.filter( '[data-unit="' + unit + '"]' )
				.addClass( 'active' );

			// Get and set the position of the range
			var unitSettings = self._unitsSettings[ unit ],
				offset = max( 0, min( 1, ( value - unitSettings.min ) / ( unitSettings.max - unitSettings.min ) ) );
			self.$range.css( ( $ush.isRtl() ? 'right' : 'left' ), offset * 100 + '%' );
		},

		/**
		 * Set the responsive screen.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_setResponsiveScreen: function( e ) {
			var self = this;
			self.renderValue( self.getCurrentValue() );
		},

		/**
		 * Handler for receiving data at the start of the move and initialization of events.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_dragstart: function( e ) {
			e.stopPropagation();
			var self = this,
				boxWidth = self.$box.width(),
				currentValue = self.getCurrentValue(),
				unit = self.getUnitData( currentValue ).unit,
				boxOffsetLeft = self.$box.offset().left;
			// If container was dynamically loaded after slider init, get it again
			if ( self.$usofContainer.length == 0 ) {
				self.$usofContainer = $( '.usof-container' );
			}
			self.$usofContainer.addClass( 'dragged' );
			self.$box.addClass( 'dragged' );
			_dragData = {
				currentValue: currentValue,
				left: boxOffsetLeft,
				right: boxOffsetLeft + boxWidth,
				unit: unit,
				unitSettings: self._unitsSettings[ unit ] || {},
				width: boxWidth,
			};
			self.$body.on( 'mousemove', self._events.dragmove );
			self.$window.on( 'mouseup', self._events.dragstop );
			self._events.dragmove( e );
		},

		/**
		 * Handler for receiving data at the time of movement.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_dragmove: function( e ) {
			e.stopPropagation();
			var self = this,
				isEmptyDragData = isEmptyObject( _dragData ),
				unitSettings = _dragData.unitSettings;

			// Get the current values for a unit
			var x, offset, value;
			if ( $ush.isRtl() ) {
				offset = isEmptyDragData ? 0 : ( _dragData.right - e.pageX ) / _dragData.width;
			} else {
				offset = isEmptyDragData ? 0 : ( e.pageX - _dragData.left ) / _dragData.width;
			}

			x = max( 0, min( 1, offset ) );
			value = $ush.parseFloat( unitSettings.min + x * ( unitSettings.max - unitSettings.min ) );
			value = round( value / unitSettings.step ) * unitSettings.step;
			value = self.roundValue( value ) + _dragData.unit;

			// Set current unit values
			self.renderValue( value );
			self.setCurrentValue( value );
		},

		/**
		 * Handler to complete the move and handle data and events.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_dragstop: function( e ) {
			e.preventDefault();
			e.stopPropagation();
			var self = this;
			if ( ! self.$usofContainer.hasClass( 'dragged' ) ) {
				return;
			}
			self.$usofContainer.removeClass( 'dragged' );
			self.$box.removeClass( 'dragged' );
			self.$body.off( 'mousemove', self._events.dragmove );
			self.$window.off( 'mouseup', self._events.dragstop );
		},

		/**
		 * Handler for the event of the cursor entering the area of the unit field.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_mouseenter: function( e ) {
			var self = this;
			_mouseEvents.map( function( eventType ) {
				_window.addEventListener( eventType, self._events.mousewheel, { passive: false } );
			} );
		},

		/**
		 * Handler for the exit event of the cursor from the area of the unit field.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_mouseleave: function( e ) {
			var self = this;
			_mouseEvents.map( function( eventType ) {
				_window.removeEventListener( eventType, self._events.mousewheel );
			} );
		},

		/**
		 * Handler to handle scrolling the mouse wheel over the unit field.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_mousewheel: function( e ) {
			var self = this;
			e.preventDefault
				? e.preventDefault()
				: ( e.returnValue = false );
			e.stopPropagation();
			if ( ! self.isFocused ) {
					return false;
			}
			var value = self.getCurrentValue(),
				floatValue = $ush.parseFloat( value ),
				unit = self.getUnitData( value ).unit,
				unitSettings = self._unitsSettings[ unit ];

			// wheelDelta doesn't let you know the number of pixels
			if ( ( e.deltaY || e.detail || e.wheelDelta ) < 0 ) {
				value = min( unitSettings.max, floatValue + unitSettings.step );
			} else {
				value = max( unitSettings.min, floatValue - unitSettings.step );
			}
			value = round( value / unitSettings.step ) * unitSettings.step;
			value = self.roundValue( value ) + unit;

			// Set current unit values
			self.renderValue( value );
			self.setCurrentValue( value );
		},

		/**
		 * Handler for intercepting pressing the Enter.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_keyup: function( e ) {
			if ( $ush.toLowerCase( e.key ) === 'enter' ) {
				this.$unitSelector.trigger( 'blur' );
			}
		},

		/**
		 * Handler for unit field when get focus.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_focus: function( e ) {
			self = this;
			self.isFocused = true;
			oldCurrentValue = self.getCurrentValue(); // save old value
		},

		/**
		 * Handler for unit field on blur event.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_blur: function( e ) {
			var self = this,
				value = $ush.toString( self.$unitSelector.val() ),
				unitData = self.getUnitData( value ),
				unitSettings = self._unitsSettings[ unitData.unit ];

			self.isFocused = false;

			// Get new value
			value = unitData.value;
			if ( value === 0 ) {
				value = oldCurrentValue;
			}
			value += '' + unitData.unit;

			// Set current unit values
			self.renderValue( value );
			self.setCurrentValue( value );
		},

		/**
		 * Handler for selected a new unit.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_selectedUnit: function( e ) {
			var self = this,
				$target = $( e.target ),
				value = self.getUnitData( self.getCurrentValue() ).value;

			// Set new unit
			value += $ush.toString( $target.data( 'unit' ) );

			// Set active unit
			self.$units.removeClass( 'active' );
			$target.addClass( 'active' );

			// Replace unit at current value
			self.renderValue( value );
			self.setCurrentValue( value );
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value The value.
		 * @param {Boolean}quiet The quiet.
		 */
		setValue: function( value, quiet ) {
			var self = this;
			if ( ! self.isResponsiveValue( value ) ) {
				self.renderValue( value );
			} else {
				self.renderValue( self.getCurrentValue() );
			}
			// Set parent value
			self.parentSetValue( '' + value );
		}

	};

}( jQuery );
