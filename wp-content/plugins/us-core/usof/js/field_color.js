/**
 * USOF Field: ColorPicker
 */
! function( $, undefined ) {
	"use strict";

	const _window = window;
	const _document = document;

	// Check for is set availability objects
	if ( $ush.isUndefined( _window.$usof ) ) {
		return;
	}

	/**
	 * @type {RegExp} Regular expression for HEX value.
	 */
	const _REGEXP_HEX_VALUE_ = /^\s?\#([\dA-f]{3,6})\s?$/;

	/**
	 * @type {RegExp} Regular expression for match RGB value.
	 */
	const _REGEXP_RGB_VALUE_ = /^([^\d]{1,3})*(\d{1,3})[^,]*,([^\d]{1,3})*(\d{1,3})[^,]*,([^\d]{1,3})*(\d{1,3})[\s\S]*$/;

	/**
	 * @type {RegExp} Regular expression for match RGBA value.
	 */
	const _REGEXP_RGBA_VALUE_ = /^([^\d]{1,3})*(\d{1,3})[^,]*,([^\d]{1,3})*(\d{1,3})[^,]*,([^\d]{1,3})*(\d{1,3})[^,]*,[^.]*.([^\d]{1,2})*(\d{1,2})[\s\S]*$/;

	/**
	 * @type {{}} Functionality for the color field.
	 */
	$usof.field[ 'color' ] = {
		init: function( options ) {
			const self = this;

			// Bondable events
			self._events = {
				changeValue: self._changeValue.bind( self ),
				clearValue: self._clearValue.bind( self ),
				hideList: self._hideList.bind( self ),
				inputValue: self._inputValue.bind( self ),
				selectedVariableInList: self._selectedVariableInList.bind( self ),
				toggleList: self._toggleList.bind( self ),
			};

			// Elements
			self.$container = $( '.usof-color', self.$row );
			self.$list = $( '.usof-color-list', self.$container );
			self.$preview = $( '.usof-color-preview', self.$container );

			// Private "Variables"
			self.isInitVariablesList;
			self.withGradient = self.$container.hasClass( 'with_gradient' );
			self.withColorList = self.$container.hasClass( 'with_color_list' );

			// Set text color to white if background is dark (for fields on post pages)
			let colorValue = self.getColorValue();
			self.$preview.css( 'background', colorValue );
			self.$input.toggleClass( 'white', self.isWhiteTextColor( colorValue ) );

			// Events
			self.$container
				.on( 'click', '.usof-color-clear', self._events.clearValue );

			self.$input
				.on( 'input', self._events.inputValue )
				.on( 'change', self._events.changeValue )

				// init ColorPicker by click
				.off( 'click' )
				.on( 'click', () => { self.$input.usofColorPicker() } );

			if ( self.withColorList ) { // events for variable list
				self.$container
					.on( 'click', '.usof-color-arrow', self._events.toggleList )
					.on( 'click', '.usof-color-list-item', self._events.selectedVariableInList );
			}

			// If the list is open and there was a click outside the list, then close the list
			$( _document ).on( 'mouseup', self._events.hideList );
		},

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
		 * Determines whether the specified value is value valid.
		 *
		 * @param {String} value The value.
		 * @return {Boolean} True if the specified value is value valid, False otherwise.
		 */
		valueIsValid: function( value ) {
			const self = this;
			return (
				value === ''
				|| value === 'inherit'
				|| value === 'transparent'
				|| self.isCssVariable( value )
				|| self.isDynamicVariable( value )
				|| usofColorPicker.isGradient( value )
				|| usofColorPicker.colorNameToHex( value )
				|| _REGEXP_RGB_VALUE_.test( value )
				|| _REGEXP_RGBA_VALUE_.test( value )
				|| _REGEXP_HEX_VALUE_.test( value )
			);
		},

		/**
		 * Determines the color of the text depend on the background color.
		 *
		 * @param {String} backgroundColor The background color.
		 * @return {Boolean} Returns True if the color is white, otherwise False.
		 */
		isWhiteTextColor: function( backgroundColor ) {
			const self = this;

			backgroundColor = $ush.toString( backgroundColor );

			let whiteHex = usofColorPicker.colorNameToHex( 'white' );
			// If there is no value or this is a reserved value, then don't install white
			if (
				! backgroundColor // is empty
				|| backgroundColor === 'inherit'
				|| backgroundColor === 'transparent'
			) {
				return false;
			}
			// If the css or dynamic variable
			if (
				self.isCssVariable( backgroundColor )
				|| self.isDynamicVariable( backgroundColor )
			) {
				backgroundColor = self.getColorValue();
				if ( self.isDynamicVariable( backgroundColor ) ) {
					backgroundColor = whiteHex; // default
				}
			}
			// If the HEX value is 3-digit, then convert it to 6-digit
			if ( backgroundColor.slice( 0, 1 ) == '#' && backgroundColor.length === 4 ) {
				backgroundColor = backgroundColor.replace( /^#([\dA-f])([\dA-f])([\dA-f])$/, "#$1$1$2$2$3$3" );
			}
			// If the value is gradient, then we get the first HEX
			else if ( backgroundColor.indexOf( 'linear-gradient' ) > -1 ) {
				backgroundColor = ( usofColorPicker.gradientParser( backgroundColor ) || {} ).hex || backgroundColor;
			}
			// If the value is a reserved name, then get the HEX
			if ( /^([A-z\-]+)$/.test( backgroundColor ) ) {
				backgroundColor = usofColorPicker.colorNameToHex( backgroundColor ) || whiteHex;
			}

			// Convert HEX string to RGBa object
			const rgba = $.extend(
				{
					r: 0,
					g: 0,
					b: 0,
					a: 1,
				},
				usofColorPicker.hexToRgba( backgroundColor )
			);
			// Determine lightness of color
			let light = rgba.r * 0.213 + rgba.g * 0.715 + rgba.b * 0.072;
			// Increase lightness regarding color opacity
			if ( rgba.a < 1 ) {
				light = light + ( 1 - rgba.a ) * ( 1 - light / 255 ) * 235;
			}
			return light < 178;
		},

		/**
		 * Show/Hide variable list.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_toggleList: function( e ) {
			const self = this;
			if ( ! self.$container.hasClass( 'show' ) ) {
				self.initVariablesList();
			}
			self.$container.toggleClass( 'show' );
		},

		/**
		 * Hide variable list.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_hideList: function( e ) {
			const self = this;
			if ( ! self.$container.hasClass( 'show' ) ) {
				return;
			}
			if ( ! self.$container.is( e.target ) && ! self.$container.has( e.target ).length ) {
				self.$container.removeClass( 'show' );
			}
		},

		/**
		 * Selecting a variable in list.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_selectedVariableInList: function( e ) {
			this.setSelectedVariable( e.currentTarget.dataset['name'] );
		},

		/**
		 * Field input handler.
		 *
		 * @event handler
		 */
		_inputValue: function() {
			const self = this;
			const value = self.getValue();
			const isDynamicVariable = self.isDynamicVariable( value );
			// If the values are variable, then initialize the list
			if ( self.isCssVariable( value ) || isDynamicVariable ) {
				self.initVariablesList();
			}
			// Set default background when enter name
			if ( isDynamicVariable ) {
				self.$preview.css( 'background', 'white' );
			}
		},

		/**
		 * Input field change handler.
		 *
		 * @event handler
		 */
		_changeValue: function() {
			const self = this;
			const value = self.getValue();
			self.setValue( value );
			self.trigger( 'change', value );
		},

		/**
		 * Clear value.
		 *
		 * @event handler
		 */
		_clearValue: function() {
			const self = this;
			if ( self.$container.hasClass( 'show' ) ) {
				self.$container.removeClass( 'show' );
			}
			$( '.selected', self.$list ).removeClass( 'selected' );
			self.setValue( '' );
		},

		/**
		 * Set selected variable.
		 *
		 * @param {String} name The color from list, example: `_css_variable` or `{{dynamic_variable}}`.
		 * @param {Boolean} quiet The quiet mode.
		 */
		setSelectedVariable: function( name, quiet ) {
			const self = this;

			name = $ush.toString( name );

			let $target = $( '[data-name="' + name + '"]:first', self.$list ),
				colorValue = $ush.toString( $target.data( 'value' ) );
			// Set white background for dynamic variables
			if ( self.isDynamicVariable( name ) ) {
				colorValue = 'white';
			}
			// Remove selected
			$( '[data-name].selected', self.$list )
				.removeClass( 'selected' );
			// Selected value
			if ( $target.length ) {
				$target.addClass( 'selected' );
				self.$input.val( $ush.toString( $target.data( 'name' ) ) );
			} else {
				self.$input.val( name );
			}
			if ( ! quiet ) {
				self.trigger( 'change', self.$input.val() );
			}
			self.$container.removeClass( 'show' );
			self.$preview.css( 'background', colorValue );
			// Set text color to white if background is dark
			self.$input.toggleClass( 'white', self.isWhiteTextColor( colorValue ) );
		},

		/**
		 * Initialize variable list.
		 */
		initVariablesList: function() {
			const self = this;
			if ( self.isInitVariablesList ) {
				return;
			}
			/**
			 * Insert item to list.
			 *
			 * @param {Node} $parent The parent node.
			 * @param {{}} item The item setting object.
			 */
			const _insert = function( $parent, item ) {
				// Exclude yourself
				if ( self.name === item.name ) {
					return;
				}
				let $item = $( '<div></div>' ),
					$preview = '';
				// Create a color preview
				if ( ! $ush.isUndefined( item.value ) ) {
					$preview = $( `
						<div class="usof-color-list-item-value">
							<span style="background:${item.value}" title="${item.value} – ${item.title}"></span>
						</div>
					` );
				}
				$item
					.addClass( 'usof-color-list-item' )
					.toggleClass( 'selected', item.name == self.getValue() )
					.attr( 'data-name', item.name )
					.data( 'value', item.value );

				$parent.addClass( item.type );

				if ( item.type == 'cf_colors' ) {
					$item.append( '<span class="usof-color-list-item-title">' + item.title + '</span>' );
				} else {
					$item.append( $preview.toggleClass( 'white', self.isWhiteTextColor( item.value ) ) );
				}
				$parent.append( $item );
			};
			// Add a variable group or variable to a list
			$.each( $usof.getData( 'colorList' ) || {}, ( groupKey, items ) => {
				// For group items
				if ( Array.isArray( items ) && items.length ) {
					let $group = $( '> [data-group="' + groupKey + '"]:first', self.$list );
					if ( ! $group.length ) {
						$group = $( `<div class="usof-color-list-group" data-group="${groupKey}"></div>` );
						self.$list.append( $group );
					}
					$.each( items, function( _, item ) {
						_insert( $group, item );
					} );

					// For item
				} else {
					_insert( self.$list, items );
				}
			} );
			self.isInitVariablesList = true;
		},

		/**
		 * Get the color value.
		 *
		 * @return {String} Returns the current color in HEX, RGB(A) or Gradient.
		 */
		getColorValue: function() {
			const self = this;
			let value = self.getValue();
			if ( self.isCssVariable( value ) ) {
				value = $ush.toString( $usof.getData( 'colorVars' )[ value ] ) || self.$container.data( 'value' ) || value;
			}
			return $ush.toString( value ).trim();
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value.
		 * @param {Boolean} quiet.
		 */
		setValue: function( value, quiet ) {
			const self = this;

			value = $ush.toString( value ).trim();

			// Remove selected
			if ( self.withColorList ) {
				$( '[data-name].selected', self.$list ).removeClass( 'selected' );
			}

			// If the values are variable, then set the variable and initialize the list.
			if (
				self.isCssVariable( value )
				|| self.isDynamicVariable( value )
			) {
				self.initVariablesList();
				self.setSelectedVariable( value, quiet );
				return;
			}

			// Check value is valid
			if ( ! self.valueIsValid( value ) ) {
				if ( _REGEXP_HEX_VALUE_.test( '#' + value ) ) {
					value = usofColorPicker.normalizeHex( value );
				} else {
					value = '';
				}
			}

			// Check and normalization of value
			let m, hex;
			if ( usofColorPicker.isGradient( value ) ) {
				const gradient = usofColorPicker.gradientParser( value );
				if ( gradient ) {
					value = gradient[ self.withGradient ? 'gradient' : 'hex' ];
				}

			} else if ( m = _REGEXP_RGBA_VALUE_.exec( value ) ) {
				var r = m[2] <= 255 ? m[2] : 255,
					g = m[4] <= 255 ? m[4] : 255,
					b = m[6] <= 255 ? m[6] : 255,
					a = m[8];
				value = 'rgba(' + r + ',' + g + ',' + b + ',0.' + a + ')';

			} else if ( m = _REGEXP_RGB_VALUE_.exec( value ) ) {
				value = usofColorPicker.rgbaToHex( {
					r: m[2],
					g: m[4],
					b: m[6],
				} );

			} else if ( hex = usofColorPicker.colorNameToHex( value ) ) {
				value = hex;
			}

			self.$preview.css( 'background', value );
			self.$input.toggleClass( 'white', self.isWhiteTextColor( value ) );

			self.parentSetValue( value, quiet );
		},

		/**
		 * Get the value.
		 *
		 * @return {String} Returns the current value.
		 */
		getValue: function() {
			return $ush.toString( this.$input.val() ).trim();
		}
	};

}( jQuery );
