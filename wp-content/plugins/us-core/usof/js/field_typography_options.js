/**
 * USOF Field: Typography Options.
 */
! function( $, undefined ) {

	$usof.field[ 'typography_options' ] = {

		/**
		 * Field initialization.
		 *
		 * @param {{}} options [optional]
		 */
		init: function( options ) {
			var self = this;

			/**
			 * @var {{}} Bondable events
			 */
			self._events = {
				changePropField: $ush.debounce( self._changePropField.bind( self ), 1 ),
				switchSection: self._switchSection.bind( self ),
			};

			// Variables
			self.fields = {}; // font properties
			self._$fontWeights = [];
			self._usbParams = self.$row.data( 'usb-params' ) || {};
			self._notExistsText = '';

			// Get disabled text
			var $notExistsText = $( '.us-font-weight-not-exists-text:first', self.$row );
			if ( $notExistsText.length ) {
				self._notExistsText = $notExistsText.text();
				$notExistsText.remove();
			}

			// Elements
			self.$head = $( 'head' );
			self.$title = $( '> .usof-form-row-title', self.$row );
			self.$typographyVars = $( '#us-typography-vars' );

			// Get all fields and subscribe to changes
			$( '.usof-form-row-control:first [data-name]', self.$row ).each( function( _, node ) {
				var $node = $( node ),
					usofField = $node.data( 'usofField' );
				if ( $ush.isUndefined( usofField ) ) {
					usofField = $node.usofField();
				}
				if ( usofField instanceof $usof.field ) {
					var name = $node.data( 'name' );
					usofField
						.on( 'change', self._events.changePropField )
						.on( 'syncResponsiveState', function( field, screenName ) {
							// TODO: Fix verification via `$usb` object
							// Set a responsive screen from $usof field
							if ( self.isLiveBuilder() && $usb.find( 'preview' ) ) {
								$usb.preview.fieldSetResponsiveScreen( screenName );
							}
							// Specific functionality for the "Theme Options - Typography" page
							if ( ! self.isLiveBuilder() ) {
								// Render typography options in the preview field
								$ush.debounce_fn_1ms( self._renderFontPreview.bind( self ) );
								// Sync responsive fields within one typography control
								$.each( self.fields, function( name, _field ) {
									if ( field.name !== name ) {
										_field._usbSyncResponsiveState( _field, screenName );
									}
								} );
							}
						} );
					self.fields[ name ] = usofField;

					// Get all option tags from weights
					if ( usofField.type === 'select' && [ 'font-weight', 'bold-font-weight' ].indexOf( name ) > -1 ) {
						$( 'option', usofField.$row ).each( function( _, node ) {
							// Values with variables are not disabled
							if ( $ush.toString( node.value ).indexOf( 'var(' ) === 0 ) {
								return;
							}
							$node = $( node );
							$node.data( 'text', $node.text() );
							self._$fontWeights.push( $node );
						} );
					}
				}
			} );

			// Handler for accordion section switch
			self.$row.on( 'click', '> .usof-form-row-title', self._events.switchSection );

			// TODO: Bring responsive values to a unified format and debug events!
			// Remove the code below after fixing it.
			if ( ! self.isLiveBuilder() ) {
				self.on( 'afterShow', function() {
					self._setFontProperties( self.getValue() );
				} );
			}
		},

		/**
		 * Switch accordion section.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_switchSection: function( e ) {
			var self = this;
			self.$row // expand or collapse accordion
				.toggleClass( 'expand', ! self.$row.hasClass( 'expand' ) )
				.siblings()
				.removeClass( 'expand' );
		},

		/**
		 * Synchronize available weights.
		 *
		 * @param {String} fontFamily The font family.
		 */
		_syncAvailableWeights: function( fontFamily ) {
			var self = this;

			// Remove all disabled for weights
			for ( var i in self._$fontWeights ) {
				var $node = self._$fontWeights[ i ];
				if ( $node.hasClass( 'not-exists' ) ) {
					$node
						.text( $node.data( 'text' ) )
						.removeClass( 'not-exists' );
				}
			}

			// Get available google fonts from export data
			var googleFonts = $usof.getData( 'googleFonts' );
			if ( ! $.isPlainObject( googleFonts ) ) {
				googleFonts = {};
			}

			// If the font is not Google Fonts then exit
			if ( ! fontFamily || ! googleFonts[ fontFamily ] ) {
				return;
			}

			// Check the availability of a value for the current font
			var googleFontWeights = ( '' + googleFonts[ fontFamily ] ).split( ',' )
				.map( function( value ) {
					return $ush.parseInt( value ); // to integer
				} );
			for ( var i in self._$fontWeights ) {
				var $node = self._$fontWeights[ i ],
					isNotExists = $.inArray( $ush.parseInt( $node.attr( 'value' ) ), googleFontWeights ) === -1;
				// Set text to option
				if ( isNotExists ) {
					var text = $node.data( 'text' );
					if ( self._notExistsText ) {
						text += ' ' + self._notExistsText;
					}
					$node.text( text );
					$node.addClass( 'not-exists' );
				}
			}
		},

		/**
		 * Set font properties.
		 *
		 * @param {{}} values The value '{name:value}', if the params is absent, the default will be set.
		 * @param {Boolean} quiet The quiet.
		 */
		_setFontProperties: function( values, quiet ) {
			var self = this;

			if (  self.isObjectValue( values ) ) {
				values = $ush.toPlainObject( values );
			}
			if ( ! $.isPlainObject( values ) ) {
				values = {};
			}

			for ( var name in self.fields ) {
				var usofField = self.fields[ name ];
				if ( usofField instanceof $usof.field ) {
					var value = $ush.isUndefined( values[ name ] )
						? usofField.getDefaultValue()
						: values[ name ];
					usofField.off( 'change' );
					usofField.setValue( value, quiet );
					usofField.on( 'change', self._events.changePropField );
				}
			}

			// Synchronize available weights
			self._syncAvailableWeights( values['font-family'] );
		},

		/**
		 * Property changes.
		 *
		 * @event handler
		 */
		_changePropField: function( usofField, value ) {
			var self = this;
			// Get font properties
			var props = {};
			for ( var name in self.fields ) {
				props[ name ] = self.fields[ name ].getValue();
			}

			// Forwarding preview parameters from an editable field, this is necessary for
			// the correct application of changes and is specific to the current field type
			var $usbField = usofField[ usofField instanceof $usof.field ? '$row' : '$field' ];
			self.$row.data( 'usbParams', $usbField.data( 'usb-params' ) || /* default */self._usbParams );

			// Set current value
			self.setCurrentValue( ! $.isEmptyObject( props ) ? props : '' );

			// Synchronize available weights
			self._syncAvailableWeights( props['font-family'] );

			// Render typography options in the preview field
			if ( ! self.isLiveBuilder() ) {
				$ush.debounce_fn_1ms( self._renderFontPreview.bind( self ) );
			}
		},

		/**
		 * Gets the current value.
		 *
		 * @return {{}} Returns the current value given the selected response state, if any.
		 */
		getCurrentValue: function() {
			var self = this, result = {};
			for ( var name in self.fields ) {
				result[ name ] = self.fields[ name ].getCurrentValue();
			}
			return result;
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value The value to be selected.
		 * @param {Boolean} quiet Sets in quiet mode without events.
		 */
		setValue: function( value, quiet ) {
			var self = this;
			if ( $.isPlainObject( value ) ) {
				value = $ush.toString( value );
			}
			// Set font properties
			self._setFontProperties( value );
			// Set parent value
			self.parentSetValue( value );
			if ( quiet ) {
				self.trigger( 'change', [ value ] );
			}
		},

		/**
		 * Render typography options in the preview field.
		 * Note: Specific method is intended for output on page "Theme Options — Typography".
		 */
		_renderFontPreview: function() {
			var self = this;

			// Check the presence of a required field
			if ( ! self.fields['font-family'] ) {
				return;
			}

			// Get font properties
			var props = {};
			for ( var name in self.fields ) {
				props[ name ] = self.fields[ name ].getCurrentValue();
			}

			/**
			 * Get normalized font family.
			 *
			 * @param {String} value The value
			 * @return {String} Returns the correct font name (in quotes if necessary).
			 */
			function _getFontFamily( value ) {
				if ( value === 'none' || value === 'inherit' ) {
					return '';
				}
				if ( /* isWebsafe */value.indexOf( ',' ) === -1 && value.indexOf( ' ' ) > -1 ) {
					return '"' + value + '"';
				}
				return value;
			}

			// Get font family
			var origFontFamily = props['font-family'];
			props['font-family'] =  _getFontFamily( origFontFamily );
			// Apply all options in preview
			var cssProp = $ush.clone( props ),
				$textPreview = $( '.usof-text-preview', self.fields['font-family'].$row );
			// Set font-weight for stront text
			$( 'strong', $textPreview ).css( 'font-weight', props[ 'bold-font-weight' ] );
			// Set font options in preview
			if ( ! $ush.isUndefined( cssProp['bold-font-weight'] ) ) {
				delete cssProp['bold-font-weight'];
			}
			// Remove property from preview if values are `none` or `inherit`
			if ( [ 'none', 'inherit' ].indexOf( origFontFamily ) > -1 ) {
				cssProp[ 'font-family' ] = '';
			}
			$textPreview.css( cssProp );

			// Set css variables for Typography
			if ( [ 'body', 'h1' ].indexOf( self.name ) > -1 ) {
				var parent = self.getParent();
				if ( ! $ush.isUndefined( parent ) ) {
					var parentValues = parent.getCurrentValues(),
						cssVars = [];
					// Get "Font family" for body
					if ( ( parentValues.body || {} )['font-family'] ) {
						cssVars.push( '--body-font-family:' + _getFontFamily( parentValues.body['font-family'] ) );
					}
					// Get H1 props
					if ( $.isPlainObject( parentValues.h1 ) ) {
						[ 'font-family', 'font-weight', 'bold-font-weight' ].map( function( name ) {
							if ( ! $ush.isUndefined( parentValues.h1[ name ] ) ) {
								var value = parentValues.h1[ name ];
								if ( name === 'font-family' ) {
									value = _getFontFamily( value );
								}
								if ( value ) {
									cssVars.push( '--h1-' + name + ':' + value );
								}
							 }
						} );
					}
					self.$typographyVars.text( ':root{' + cssVars.join( ';' ) + '}' );
				}
			}

			// Import Google Fonts selected in the typography options
			if ( /* isWebsafe */origFontFamily.indexOf( ',' ) === -1 && origFontFamily.indexOf( 'var(--' ) === -1 ) {
				var googleFonts = $usof.getData( 'googleFonts' ) || {};
				if ( googleFonts[ origFontFamily ] && $usof.googlefontEndpoint ) {
					var $linkToResource = $( 'link[data-font-for="' + self.name + '"]', self.$head );
					if ( ! $linkToResource.length ) {
						$linkToResource = $( '<link>', { rel: 'stylesheet', 'data-font-for': self.name, 'href': '' } );
						self.$head.append( $linkToResource );
					}
					var urlManager = new URL( $usof.googlefontEndpoint );
					urlManager.searchParams.set( 'family', origFontFamily + ':' + googleFonts[ origFontFamily ] );
					if ( $linkToResource.attr( 'href' ) !== urlManager.toString() ) {
						$linkToResource.attr( 'href', urlManager.toString() );
					}
				}
			}
		}
	};
}( jQuery );
