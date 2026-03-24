/**
 * USOF Field: Text / Textarea
 */
! function( $, undefined ) {

	if ( $ush.isUndefined( window.$usof ) ) {
		return;
	}

	$usof.field[ 'text' ] = {
		/**
		 * Initializes the object.
		 */
		init: function() {
			var self = this;

			// Variables
			self._dynamicLabels = {};

			// Elements
			self.$text = $( 'input[type=text]', self.$row ); // text or textarea

			/**
			 * @var {{}} Bondable events.
			 */
			self._events = {
				blurField: self._blurField.bind( self ),
				// Note: debounce is used to get the correct value when paste text.
				changeField: $ush.debounce( self._changeField.bind( self ) ),
				setExampleValue: self._setExampleValue.bind( self ),
				syncCurrentValue: self._syncCurrentValue.bind( self ),
			};

			// Initializes the dynamic value
			self.initDynamicValue();

			// Events
			self.$row
				// Handler for set the value from the example
				.on( 'click', '.usof-example', self._events.setExampleValue )
				// Handler for changes in the current text field
				.on( 'change paste keyup', 'input[type=text]', self._events.changeField )
				// Handler for blur in the current text field
				.on( 'blur', 'input[type=text]', self._events.blurField );

			// Sync value for current screen
			if ( self.hasResponsive() ) {
				self.on( 'setResponsiveState', self._events.syncCurrentValue );
			}
		},

		/**
		 * Handler for set the value from the example.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_setExampleValue: function( e ) {
			var self = this,
				exampleValue =  ( $( e.target ).closest( '.usof-example' ).html() || '' );

			// Set current value
			self.$text.val( exampleValue );
			self.setCurrentValue( exampleValue );
		},

		/**
		 * Handler for changes in the current text field.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_changeField: function( e ) {
			this.setCurrentValue( e.currentTarget.value );
		},

		/**
		 * Handler for blur in the current text field.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_blurField: function( e ) {
			this.trigger( 'blur', this.getCurrentValue() );
		},

		/**
		 * Sync value for current screen.
		 *
		 * @event handler
		 */
		_syncCurrentValue: function() {
			var self = this;
			self.$text.val( self.getCurrentValue() );
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value The value to be selected.
		 * @param {Boolean} quiet Sets in quiet mode without events.
		 */
		setValue: function( value, quiet ) {
			var self = this;

			// Set current value
			self.parentSetValue( '' + value, quiet ); // set parent value
			self._syncCurrentValue();

			// Set dynamic value if active
			if ( self.popupId ) {
				self.setDynamicValue( value );
			}
		}
	};

	// Dynamic values functionality
	$.extend( $usof.field[ 'text' ], {

		/**
		 * Initializes the dynamic value.
		 */
		initDynamicValue: function() {
			var self = this;

			/**
			 * @var {{}} Bondable events.
			 */
			$.extend( self._events, {
				selectDynamicVariable: self._selectDynamicValue.bind( self ),
				removeDynamicValue: self._removeDynamicValue.bind( self ),
			} )

			// Elements
			self.$valueSelected = $( '.usof-form-input-dynamic-value', self.$row );

			// Variables
			self.popupId = $( '[data-popup-show]:first', self.$row ).data( 'popup-show' );

			// Create a new popup support dynamic variables
			if ( self.popupId ) {
				self.popup = new $usof.popup( self.popupId, {
					closeOnEsc: true, // close the popup by pressing Escape
					closeOnBgClick: true, // close the popup when user clicks on the dark overlay
					// Fires after first initialization
					init: function() {
						var $popupContainer = this.$container
						/*popup*/this.$container
							.off( 'click' )
							.on( 'click', '[data-dynamic-value]', self._events.selectDynamicVariable )
							.find( '[data-dynamic-value]' )
							.each( function( _, node ) {
								var $node = $( node );
								if ( $node.data( 'dynamic-label' ) ) {
									self._dynamicLabels[ $node.data( 'dynamic-value' ) ] = $node.data( 'dynamic-label' );
									$node.removeAttr( 'data-dynamic-label' );
								}
							} );
					},
					// Handler is called before the popup show
					beforeShow: function() {
						// Set or remove active class
						$( '[data-dynamic-value]', /*popup*/this.$container ).removeClass( 'active' );
						var value = $ush.toString( self.$text.val() );
						if ( self.isDynamicVariable( value ) ){
							$( '[data-dynamic-value="'+ value +'"]', /*popup*/this.$container ).addClass( 'active' );
						}
					}
				} );

				// Check the initialization of the popup
				if ( $.isEmptyObject( self.popup ) ) {
					console.error( 'Failed to initialize popup' );
				}
			}

			// Events
			self.$row
				// Handler for remove the dynamic value
				.on( 'click', '.action_remove_dynamic_value', self._events.removeDynamicValue );

			if ( self.isVCParamValue() ) {
				self.setValue( self.$input.val() );
			}
		},

		/**
		 * Handler for select a dynamic value in a popup.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_selectDynamicValue: function( e ) {
			e.preventDefault();
			var self = this;

			// Set the dynamic value
			self.setDynamicValue( $( e.target ).data( 'dynamic-value' ) );

			// Hide a popup by its id
			if ( self.popupId ) {
				$usof.hidePopup( $ush.toString( self.popupId ) );
			}
		},

		/**
		 * Set or unset dynamic value.
		 *
		 * @param {String} value The dynamic value.
		 */
		setDynamicValue: function( value ) {
			var self = this;
			value = $ush.toString( value );

			// Hide dynamic value
			if (
				! self.isDynamicVariable( value )
				|| ! self._dynamicLabels[ value ]
			) {
				self.$valueSelected.addClass( 'hidden' );
				self.$text.removeClass( 'hidden' );
				self.$text[0].focus();

				// Show dynamic value
			} else {
				var title = self._dynamicLabels[ value ] || value;
				self.$valueSelected
					.removeClass( 'hidden' )
					.find( '.usof-form-input-dynamic-value-title' )
					.attr( 'title', title )
					.text( title );

				self.$text.addClass( 'hidden' );
			}

			self.$text.val( value ).trigger( 'change' );
		},

		/**
		 * Handler for remove the dynamic value.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_removeDynamicValue: function( e ) {
			e.preventDefault();
			e.stopPropagation();
			this.setDynamicValue( '' );
		}
	} );

	// TODO: Add support for responsive values
	$usof.field[ 'textarea' ] = {
		/**
		 * Initializes the object.
		 */
		init: function() {
			var self = this;
			// Events
			self.$row.on( 'click', '.usof-example', self._setExampleValue.bind( self ) );
			// Note: debounce is used to get the correct value when paste text
			self.$input.on( 'change paste keyup', $ush.debounce( function() {
				self.trigger( 'change', [ self.getValue() ] );
			} ) );
		},

		/**
		 * Set example value
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_setExampleValue: function( e ) {
			this.setValue( $( e.target ).closest( '.usof-example' ).html() || '' );
		}
	};

}( jQuery );
