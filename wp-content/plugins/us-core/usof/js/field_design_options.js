/**
 * USOF Field: Design Options
 * TODO: Make code optimizations to improve performance!
 */
! function( $, _undefined ) {
	// Private variables that are used only in the context of this function, it is necessary to optimize the code
	var _window = window,
		_document = document;

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};

	if ( $ush.isUndefined( _window.$usof ) ) {
		return;
	}

	$usof.field[ 'design_options' ] = {
		init: function() {
			var self = this;

			// Variables
			self._lastSelectedScreen = 'default';
			self.defaultGroupValues = {}; // default param values by groups
			self.defaultValues = {}; // default inline values
			self.groupParams = {};

			// Elements
			self.$container = $( '.usof-design-options', self.$row );
			self.$input = $( 'textarea.usof_design_value', self.$container );
			self.$import = $( '.usof-design-options-import', self.$container );
			self.$btnCopyToClipboard = $( 'button.copy_to_clipboard', self.$import );
			self.$errorMessage = $( '.usof-design-options-import-novalid', self.$import );

			// Get responsive states
			self.states = $ush.toArray( self.$container[0].onclick() || ['default'] );
			self.screensList = self.states.slice( 1 );
			self.$container.removeAttr( 'onclick' );

			// The value is a string otherwise it will be an object
			self.hasStringValue = (
				self.isLiveBuilder()
				|| self.isVCParamValue()
			);

			if ( self.isVCParamValue() ) {
				self.$container
					.closest( '.edit_form_line' )
					.addClass( 'usof-not-live' );
			}

			/**
			 * @var {{}} Bondable events.
			 */
			self._events = {
				changeValue: $ush.debounce( self._changeValue.bind( self ), 1 ),
				copyValueToClipboard: self._copyValueToClipboard.bind( self ),
				pasteValueFromClipboard: self._pasteValueFromClipboard.bind( self ),
				resetValues: self._resetValues.bind( self ),
				selectResponsiveState: self._selectResponsiveState.bind( self ),
				toggleAccordion: self._toggleAccordion.bind( self ),
				toggleResponsive: self._toggleResponsive.bind( self ),

				switchRelatedFields: self.switchRelatedFields.bind( self ),
				changedRelatedField: $ush.debounce( self.changedRelatedField.bind( self ), 1 ),
			};

			/**
			 * Check for changes in the param group
			 * Note: The code is moved to a separate function since `debounced` must be initialized before calling
			 *
			 * @type debounced
			 * TODO: There was a replacement for `$ush.debounce()` and we need to test the functionality well
			 */
			self.__checkChangeValues = $ush.debounce( self.checkChangeValues.bind( self ), 1 );

			// Creates copy settings for different screen sizes
			if ( self.screensList.length ) {
				$( '[data-responsive-state-content="default"]', self.$container ).each( function( _, content ) {
					var $content = $( content );
					self.screensList.map( function( screen ) {
						var $cloneContent = $content
							.clone()
							.attr( 'data-responsive-state-content', screen )
							.addClass( 'hidden' );
						$content
							.after( $cloneContent );
					} );
				} );
			}

			// Create screens group
			self.states.map( function( screen ) {
				self.groupParams[ screen ] = new $usof.GroupParams(
					$( '[data-responsive-state-content="' + screen + '"]', self.$container )
				);
			} );

			$.each( self.groupParams, function( screen, groupParams ) {
				// Group start params
				$.each( groupParams.fields, function( fieldName, field ) {
					var $group = field.$row.closest( '[data-accordion-content]' ),
						value = field.getValue();
					if ( $group.length ) {
						var groupKey = $group.data( 'accordion-content' );

						// Save groups
						if ( ! self.defaultGroupValues.hasOwnProperty( groupKey ) ) {
							self.defaultGroupValues[ groupKey ] = {};
						}
						if ( ! self.defaultGroupValues[ groupKey ].hasOwnProperty( screen ) ) {
							self.defaultGroupValues[ groupKey ][ screen ] = {};
						}
						self.defaultGroupValues[ groupKey ][ screen ][ fieldName ] = value;

						// Save default value
						if ( ! self.defaultValues.hasOwnProperty( screen ) ) {
							self.defaultValues[ screen ] = {};
						}
						self.defaultValues[ screen ][ fieldName ] = value;
						$group.data( 'responsive-state', screen )
						field.screen = screen;
					}
				} );

				// Init related fields and events
				$.each( groupParams.fields, function( _, usofField ) {
					var $row = usofField.$row;
					if ( $row.is( '[onclick]' ) ) {
						usofField.$$relatedFields = [ usofField ];
						usofField._data = $row[0].onclick() || {};
						if ( usofField._data.relations && usofField.screen ) {
							$.each( self.groupParams[ usofField.screen ].fields, ( name, itemField ) => {
								if ( $.inArray( name, usofField._data.relations || [] ) !== -1 ) {
									usofField.$$relatedFields.push( itemField );
									itemField.$$relatedFields = usofField.$$relatedFields;
								}
							} );
						}
						$row.removeAttr( 'onclick' );
						$row.append( '<i class="fas fa-unlink"></i>' );
						$row.on( 'click', 'i.fas', self._events.switchRelatedFields );
					}
					usofField.trigger( 'beforeShow' );
					usofField.on( 'change', self._events.changeValue );
				} );
			} );

			// Init params for shortcodes
			var pid = $ush.timeout( function() {
				if ( ! self.inited ) {
					self.setValue( self.$input.val() );
					self.checkChangeValues();
				}
				self.$btnCopyToClipboard.prop( 'disabled', ! self.getValue() );
				$ush.clearTimeout( pid );
			}, 1 );

			// Show / Hide states panel
			$( '.usof-responsive-buttons', self.$container )
				.toggleClass( 'hidden', ! self.screensList.length );

			// Events
			self.$container
				.on( 'click', '[data-accordion-id]', self._events.toggleAccordion )
				.on( 'click', '.usof-design-options-reset', self._events.resetValues )
				.on( 'click', '.usof-design-options-responsive', self._events.toggleResponsive )
				.on( 'click', '[data-responsive-state]', self._events.selectResponsiveState )
				.on( 'click', 'button.copy_to_clipboard', self._events.copyValueToClipboard )
				.on( 'click', 'button.paste_from_clipboard', self._events.pasteValueFromClipboard );
		},

		/**
		 * Сopy value to clipboard.
		 *
		 * @event handler
		 */
		_copyValueToClipboard: function() {
			var self = this,
				value = self.$input.val();
			if ( value ) {
				$ush.copyTextToClipboard( value );
				$ush.storage( 'usof' ).set( 'design_options', value );
			}
		},

		/**
		 * Paste value from clipboard.
		 *
		 * @event handler
		 */
		_pasteValueFromClipboard: function() {
			var self = this,
				isValid = false,
				value = $ush.toString( $ush.storage( 'usof' ).get( 'design_options' ) ).trim();
			if ( ! value ) {
				return;
			}
			try {
				value = $ush.toPlainObject( value );
				for ( var i in self.states ) {
					var state = self.states[ i ];
					if ( state && value[ state ] ) {
						isValid = true;
						break;
					}
				}
			} catch ( err ) {
			}
			if ( isValid  ) {
				// Reset values to default
				$.each( self.groupParams, function( screen, groupParams ) {
					groupParams.setValues( self.defaultValues[ screen ] || {}, true );
				} );
				self.setValue( value );
			}
			self.$errorMessage.toggleClass( 'hidden', isValid );
		},

		/**
		 * Switch bindings for related fields
		 *
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		switchRelatedFields: function( e ) {
			let self = this,
				$button = $( e.currentTarget ),
				isDisabled = $button.hasClass( 'fa-unlink' ),
				mainField = $( e.delegateTarget ).data( 'usofField' ),
				mainValue = mainField.getValue();

			$button
				.toggleClass( 'fa-unlink', ! isDisabled )
				.toggleClass( 'fa-link', isDisabled );

			mainField.$$relatedFields.map( ( relatedField ) => {
				if ( isDisabled ) {
					if ( relatedField !== mainField ) {
						relatedField.setValue( mainValue );
					}
					relatedField.on( 'change', self._events.changedRelatedField );
				} else {
					relatedField.off( 'change', self._events.changedRelatedField );
				}
			} );
		},

		/**
		 * Sync values in all related fields.
		 *
		 * @event handler
		 * @param {$usof.field} relatedField The related field.
		 */
		changedRelatedField: function( relatedField ) {
			let value = relatedField.getValue();
			relatedField.$$relatedFields.map( ( itemField ) => {
				if ( itemField !== relatedField ) {
					itemField.setValue( value, /* quiet */true );
				}
			} );
		},

		/**
		 * Collects params into a string when change any param.
		 *
		 * @param {$usof.field} usofField
		 */
		_changeValue: function( usofField ) {
			var self = this,
				result = {}, // result of design options
				enabledResponsives = [], // params with active responsive settings
				valuesChanged = {}; // params whose values are set

			// Define params that have resposive settings enabled and values set
			$( '[data-accordion-id].responsive', self.$container ).each( function( _, node ) {
				var accordionId = $( node ).data( 'accordionId' ),
					props = self.defaultGroupValues[ accordionId ].default || {};
				for ( var k in props ) {
					enabledResponsives.push( k );
					valuesChanged[ k ] = [];
					$.each( self.groupParams, function( _, groupParams ) {
						valuesChanged[ k ].push( groupParams.getValue( k ) );
					} );
				}
			} );

			// Get values for result
			$.each( self.groupParams, function( screen, groupParams ) {
				$.each( groupParams.getValues(), function( param, value ) {
					var defaultValue = self.defaultValues[ screen ][ param ],
						isValueChanged = false;
					// If responsive screens are enabled, then check the value setting on any screen
					if ( enabledResponsives.indexOf( param ) > -1 ) {
						for ( var i in valuesChanged[ param ] ) {
							isValueChanged = valuesChanged[ param ][ i ] !== defaultValue;
							if ( isValueChanged ) {
								break;
							}
						}
					}
					// If the value is set, then add to the result
					if ( isValueChanged || value !== defaultValue ) {
						if ( ! $.isPlainObject( result[ screen ] ) ) {
							result[ screen ] = {};
						}
						if ( param === 'background-image' && /http/.test( value ) ) {
							value = 'url(' + value + ')';
						}
						result[ screen ][ param ] = value;
					}
				} );
			} );

			// Due to the nature of WPBakery Page Builder, we convert
			// special characters standard escape function
			result = $ush.toString( result );
			if ( result === /* $ush.toString( {} ) > */'%7B%7D' ) {
				result = '';
			}

			self.$input.val( result );

			// Only when the result changes, then fire the change event.
			if ( ! self._lastResult || self._lastResult !== result ) {
				self._lastResult = result;
				self.trigger( 'change', result );
			}

			self.__checkChangeValues();
			self.$btnCopyToClipboard.prop( 'disabled', ! result ); // enable or disable button
			self.trigger( 'changeDesignField', usofField ); // send an event to Live Builder
		},

		/**
		 * Resets all group settings to default.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_resetValues: function( e ) {
			e.stopPropagation();
			var self = this,
				$target = $( e.currentTarget ),
				$groupHeader = $target.closest( '[data-accordion-id]' ),
				groupName = $groupHeader.data( 'accordion-id' );

			// Hide responsive options
			if ( $groupHeader.hasClass( 'responsive' ) ) {
				self._events.toggleResponsive( e );
			}
			if ( self.defaultGroupValues.hasOwnProperty( groupName ) ) {
				$.each( self.defaultGroupValues[ groupName ], function( screen, defaultValues ) {
					var groupParams = self.groupParams[ screen ];
					/**
					 * Note: Setting the default values is done by combining from the
					 * current ones because of the way usof works.
					 */
					groupParams.setValues( $.extend( groupParams.getValues(), defaultValues ) );
					// Didable fields link
					$.each( defaultValues, function( groupParams, name ) {
						var fields = groupParams.fields;
						if (
							fields.hasOwnProperty( name )
							&& fields[ name ].hasOwnProperty( '_data' )
							&& fields[ name ]._data.hasOwnProperty( 'relations' )
						) {
							var $link = $( 'i.fas', groupParams.$fields[ name ] );
							if ( $link.length && $link.hasClass( 'fa-link' ) ) {
								$link.trigger( 'click' );
							}
						}
					}.bind( self, groupParams ) );
				} );
			}
			var pid = $ush.timeout( function() {
				$groupHeader.removeClass( 'changed' );
				$ush.clearTimeout( pid );
			}, 1000 * 0.5 );
		},

		/**
		 * Accordion Switch.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_toggleAccordion: function( e ) {
			var $target = $( e.currentTarget ),
				$content = $( '[data-accordion-content="' + $target.data( 'accordion-id' ) + '"]' );
			if ( $target.hasClass( 'active' ) ) {
				$target.removeClass( 'active' );
				$content.removeClass( 'active' );
			} else {
				$target.siblings().removeClass( 'active' );
				$content.siblings().removeClass( 'active' );
				$target.addClass( 'active' );
				$content.addClass( 'active' );
			}
		},

		/**
		 * ON/OFF Responsive options.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_toggleResponsive: function( e ) {
			e.preventDefault();
			e.stopPropagation();

			var self = this,
				$target = $( e.currentTarget ),
				$header = $target.closest( '[data-accordion-id]' ),
				groupKey = $header.data( 'accordion-id' ),
				isEnabled = $header.hasClass( 'responsive' ),
				// Determine the first responsive settings or not
				isFirstResponsive = ! isEnabled
					? ! $( '.usof-design-options-header.responsive:first', self.$container ).length
					: false;

			$header.toggleClass( 'responsive', ! isEnabled );

			if ( ! isEnabled ) {
				// If the first setting will send a change event
				if ( isFirstResponsive ) {
					self.trigger( 'syncResponsiveState', self._lastSelectedScreen );
				}
				self.switchResponsiveState( self._lastSelectedScreen );
			} else {
				self.switchResponsiveState( 'default', /* hidden */true );
			}

			if ( self.defaultGroupValues.hasOwnProperty( groupKey ) ) {
				self.screensList.map( function( screen ) {
					// Reset values for a group whose responsive support is enabled
					var values = $.extend( {}, self.defaultGroupValues[ groupKey ][ screen ] || {} );
					if ( ! isEnabled ) {
						// Set default values for current screen
						$.each( values, function( prop ) {
							if ( self.groupParams[ 'default' ].fields.hasOwnProperty( prop ) ) {
								values[ prop ] = self.groupParams[ 'default' ].fields[ prop ].getValue();
							}
						} );
					}
					if (
						self.groupParams.hasOwnProperty( screen )
						&& self.groupParams[ screen ] instanceof $usof.GroupParams
					) {
						// Get current values to support already set values
						values = $.extend( self.groupParams[ screen ].getValues(), values );
						self.groupParams[ screen ].setValues( values, /* quiet mode */ true );
					}
					// Checking and duplicating wiretap related fields
					if ( ! isEnabled && self.groupParams.hasOwnProperty( screen ) ) {
						$.each( self.groupParams[ 'default' ].fields, function( _, field ) {
							if ( field.hasOwnProperty( 'watchValue' ) ) {
								$( '.fas', self.groupParams[ screen ].fields[ field.name ].$row )
									.trigger( 'click', field.watchValue );
							}
						} );
					}
				} );
			}
		},

		/**
		 * Handler for selecting a responsive state on click of a button.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_selectResponsiveState: function( e ) {
			var self = this,
				screen = $( e.currentTarget ).data( 'responsive-state' );
			self.switchResponsiveState( screen );
			self.trigger( 'syncResponsiveState', screen );
			self._lastSelectedScreen = screen;
		},

		/**
		 * This is the install handler `screen` of builder.
		 *
		 * @event handler
		 * @param {Event} _
		 * @param {String} screen The screen name 'mobiles', 'tablets', 'laptops' or 'default'.
		 */
		_usbSyncResponsiveState: function( _, screen ) {
			var self = this;
			self._lastSelectedScreen = screen || 'default';
			self.switchResponsiveState( self._lastSelectedScreen );
		},

		/**
		 * Switch screens.
		 *
		 * @param {String} screen
		 * @param {Boolean} hidden
		 */
		switchResponsiveState: function( screen, hidden ) {
			var self = this;
			if ( ! screen ) {
				return;
			}
			// Switch between hidden/shown targets
			var hasResponsiveClass = ! hidden
				? '.responsive'
				: ':not(.responsive)'

			// Get active responsive blocks
			var $target = $( '[data-accordion-id]' + hasResponsiveClass, self.$container )
					.next( '[data-accordion-content]' )
					.find( '[data-responsive-state="'+ screen +'"]' );
			// Remove active class from siblings
			$target
				.siblings()
				.removeClass( 'active' );
			// Show the required content by screen
			$target
				.addClass( 'active' )
				.closest( '.usof-design-options-content' )
				.find( '> [data-responsive-state-content]' )
				.addClass( 'hidden' )
				.filter( '[data-responsive-state-content="' + screen + '"]' )
				.removeClass( 'hidden' );
		},

		/**
		 * Check for changes in the param group.
		 */
		checkChangeValues: function() {
			var self = this,
				currentGroupValues = {};
			$.each( self.groupParams, function( screen, groupParams ) {
				$.each( groupParams.fields, function( _, field ) {
					var groupName = field.$row
						.closest( '[data-accordion-content]' )
						.data( 'accordion-content' );
					if ( ! currentGroupValues.hasOwnProperty( groupName ) ) {
						currentGroupValues[ groupName ] = {};
					}
					if ( ! currentGroupValues[ groupName ].hasOwnProperty( screen ) ) {
						currentGroupValues[ groupName ][ screen ] = {};
					}
					currentGroupValues[ groupName ][ screen ][ field.name ] = field.getValue();
				} );
			} );
			$.each( self.defaultGroupValues, function( groupName, screensList ) {
				var change = false;
				$.each( screensList, function( screen, values ) {
					if ( ! currentGroupValues.hasOwnProperty( groupName ) || ! currentGroupValues[ groupName ].hasOwnProperty( screen ) ) {
						return;
					}
					change = ( change || JSON.stringify( values ) !== JSON.stringify( currentGroupValues[ groupName ][ screen ] ) );
				} );
				$( '[data-accordion-id=' + groupName + ']', self.$container )
					.toggleClass( 'changed', change );
			} );
		},

		/**
		 * Get the value.
		 *
		 * @return {String} Returns design options as a string or object.
		 */
		getValue: function() {
			var self = this,
				value = self.$input.val().trim();
			if ( ! self.hasStringValue && value && typeof value === 'string' ) {
				value = $ush.toPlainObject( value );
			}
			return value;
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value
		 * @param {Boolean} quiet The quiet
		 */
		setValue: function( value, quiet ) {
			var self = this;

			// Get saved param values
			var savedValues = {};
			if ( typeof value === 'string' ) {
				savedValues = $ush.toPlainObject( value );
			} else if ( $.isPlainObject( value ) ) {
				savedValues = value;
			}

			var pid = $ush.timeout( function() {
				// Set values and check link
				$.each( self.groupParams, function( screen, groupParams ) {
					// Reset values
					if ( ! self.hasStringValue ) {
						groupParams.setValues( self.defaultValues[ screen ] || {}, true );
					}
					var values = savedValues[ screen ] || {};
						propName = 'background-image';
					// Image URL support
					if ( values.hasOwnProperty( propName ) && /url\(/.test( values[ propName ] || '' ) ) {
						values[ propName ] = values[ propName ]
							.replace( /\s?url\("?(.*?)"?\)/gi, '$1' );
					}
					// Border style support.
					for ( var k in values ) {
						if ( ! /border-(\w+)-style/.test( k ) ) {
							continue;
						}
						values[ 'border-style' ] = values[ k ];
						delete values[ k ];
					}
					// Set values
					groupParams.setValues( values, true );
					// Check relations link
					$.each( groupParams.fields, function( _, field ) {
						if ( field.hasOwnProperty( '_data' ) && field._data.hasOwnProperty( 'relations' ) ) {
							var $row = field.$row,
								value = $ush.toString( field.getValue() ).trim(),
								isLink = [];
							// Matching all related params, and if necessary enable communication.
							( field._data.relations || [] ).map( function( name ) {
								if ( value && self.groupParams[ field.screen ].fields.hasOwnProperty( name ) ) {
									isLink.push( value === $ush.toString( self.groupParams[ field.screen ].fields[ name ].getValue() ).trim() );
								}
							} );
							if ( isLink.length ) {
								isLink = isLink.filter( function( v ) {
									return v == true
								} );
								if ( isLink.length === 3 ) {
									var pid = $ush.timeout( function() {
										$( 'i.fas', $row ).trigger( 'click' );
										$ush.clearTimeout( pid );
									}, 1 );
								}
							}
						}
					} );
				} );

				// Check options for screens
				var responsiveGroups = {};
				self.screensList.map( function( screen ) {
					var values = savedValues[ screen ] || {};
					$.each( self.defaultGroupValues, function( groupKey, screensList ) {
						var isEnabled = false;
						$.each( screensList[ screen ], function( prop ) {
							if ( ! responsiveGroups[ groupKey ] ) {
								responsiveGroups[ groupKey ] = values.hasOwnProperty( prop );
							}
						} );
					} );
				} );

				$.each( responsiveGroups, function( groupKey, isEnabled ) {
					$( '[data-accordion-id="' + groupKey + '"]', self.$container )
						.toggleClass( 'responsive', isEnabled );
				} );

				self.checkChangeValues(); // check for changes in the param group
				self.switchResponsiveState( 'default', /* hidden */true ); // default tab selection
			}, 1 );

			// Set value
			if ( value ) {
				value = self.hasStringValue ? value : $ush.toString( value );
			}
			self.$input.val( $ush.toString( value ) );

			if ( ! quiet ) {
				self.trigger( 'change', [ value ] );
			}

			// Hide all sections of the accordion
			if ( ! self.isVCParamValue() ) {
				$( '> div', self.$container ).removeClass( 'active' );
			}
		},

		/**
		 * Force value for WPBakery.
		 */
		forceWPBValue: function() {
			var self = this;
			if ( self.hasStringValue ) {
				self.setValue( self.getValue() );
			}
		}
	};
}( jQuery );
