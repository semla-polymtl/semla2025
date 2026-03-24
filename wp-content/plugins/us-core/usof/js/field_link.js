/**
 * USOF Field: Advanced Links
 */
! function( $, undefined ) {

	// Private variables that are used only in the context of this function, it is necessary to optimize the code
	var _window = window,
		_document = document;

	var isUndefined = $ush.isUndefined;

	// Check for is set objects
	_window.$ush = _window.$ush || {};

	// If there is no $usof we do nothing
	if ( isUndefined( _window.$usof ) ) {
		return;
	}

	/**
	 * @type {RegExp} Regular expression for check related fields.
	 */
	const _REGEXP_RELATED_FIELD_NAME_ = /^([A-z\d_\-]+)_value$/;

	/**
	 * @var {Numeric} Timer ID when entering characters
	 */
	var _typingTimer = 0;

	/**
	 * @type {{}} Field Methods Factory.
	 */
	$usof.field[ 'link' ] = {
		init: function() {
			var self = this;

			// Elements
			self.$container = $( '.usof-link', self.$row );
			self.$linkAtts = $( '.usof-link-attributes', self.$row );
			self.$valueSelected = $( '.usof-form-input-dynamic-value', self.$row );
			self.$inputUrl = $( '.usof-link-input-url', self.$row );
			self.$urlSearchResults = $( '.usof-link-search-results', self.$row );
			self.$urlSearchNotice = $( '.usof-link-search-message', self.$urlSearchResults );
			self.$checkboxes = $( 'input[type="checkbox"]', self.$linkAtts );

			// Variables;
			self.popup = {};
			self.relatedFields = {};
			self._dynamicLabels = {};
			self.hasDynamicValues = $( '.usof-popup', self.$row ).length;
			// Delay for search requests
			self._typingDelay = 0.5;
			self.urlSearchDoingAjax = false;
			self.urlSearchAjaxQueriesNumber = 0;
			self.urlSearcAjaxQueryArgs = {
				action: 'usof_search_items_for_link',
				_nonce: self.$inputUrl.data( 'nonce' )
			};

			// Get related fields with checkboxes
			self.$checkboxes.each( function( _, checkbox ) {
				var name = checkbox.name,
					$input = $( 'input[name="'+ name +'_value"]', self.$linkAtts );
				if ( $input.length ) {
					self.relatedFields[ name ] = $input;
				}
			} );

			/**
			 * @var {{}} Bondable events
			 */
			self._events = {
				changeCheckbox: self._changeCheckbox.bind( self ),
				removeDynamicValue: self._removeDynamicValue.bind( self ),
				selectDynamicValue: self._selectDynamicValue.bind( self ),
				toggleMenu: self._toggleMenu.bind( self ),
				inputUrlKeyUpDown: self._inputUrlKeyUpDown.bind( self ),
				toggleUrlSearchResults: self._toggleUrlSearchResults.bind( self ),
				urlSearchResultsSelect: self._urlSearchResultsSelect.bind( self ),
				urlSearchResultsScroll: self._urlSearchResultsScroll.bind( self ),
			};

			// If there are dynamic values, then there must be a popup window
			if ( self.hasDynamicValues ) {

				// Set a unique popup id (this is necessary for groups like Dropdown)
				self.popupId = $ush.uniqid();
				$( '[data-popup-id]', self.$row ).attr( 'data-popup-id', self.popupId );
				$( '[data-popup-show]', self.$row ).attr( 'data-popup-show', self.popupId );

				// Create a new popup
				self.popup = new $usof.popup( self.popupId, {
					closeOnEsc: true, // close the popup by pressing Escape
					closeOnBgClick: true, // close the popup when user clicks on the dark overlay
					// Fires after first initialization
					init: function() {
						/*popup*/this.$container
							.off( 'click' )
							.on( 'click', '[data-dynamic-value]', self._events.selectDynamicValue )
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
						var dynamicValue = self.$valueSelected.data( 'value' );

						// Sync of dynamic value with popup buttons
						self._resetPopupButtons(); // reset all buttons in the popup
						if ( ! isUndefined( dynamicValue ) ) {
							$( '[data-dynamic-value="' + dynamicValue + '"]', /*popup*/this.$container ).addClass( 'active' );
						}
					}
				} );

				// Check the initialization of the popup
				if ( $.isEmptyObject( self.popup ) ) {
					console.error( 'Failed to initialize popup' );
				}
			}

			// Events
			self.$container
				.on( 'click', '.action_toggle_menu', self._events.toggleMenu )
				.on( 'input change', 'input[type="text"]', $ush.debounce( self.updateValue.bind( self ), 1 ) );
			self.$inputUrl.off()
				.on( 'keydown keyup', self._events.inputUrlKeyUpDown )
				.on( 'focus blur', self._events.toggleUrlSearchResults );
			self.$urlSearchResults.off()
				.on( 'mousedown', '.usof-link-search-results-item', self._events.urlSearchResultsSelect )
				.on( 'scroll', self._events.urlSearchResultsScroll );

			if ( self.hasDynamicValues ) {
				self.$container.on( 'click', '.action_remove_dynamic_value', self._events.removeDynamicValue );
			}

			// Events the menus
			self.$linkAtts
				.on( 'change', '.usof-checkbox', self._events.changeCheckbox );

			// Set the value for static field (for example on the post page)
			var value = self.getValue();
			if ( value ) {
				self.setValue( value );
			}
		},

		/**
		 * Hide attributes menu.
		 */
		hideMenu: function() {
			this.$container.removeClass( 'show_atts_settings' );
		},

		/**
		 * Handler for show or hide attributes menu.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_toggleMenu: function( e ) {
			e.preventDefault();
			this.$container.toggleClass( 'show_atts_settings' );
		},

		/**
		 * Reset all buttons in the popup.
		 *
		 * @param {String|undefined} skipDynamicValue Skip dynamic value on reset.
		 */
		_resetPopupButtons: function( skipDynamicValue ) {
			var self = this;
			if ( self.popup.$container instanceof $ ) {
				$( '[data-dynamic-value!="'+ skipDynamicValue +'"].active', self.popup.$container )
					.removeClass( 'active' );
			}
		},

		/**
		 * Handler for changes to checkbox.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_changeCheckbox: function( e ) {
			var self = this,
				name = e.target.name;
			// Reset the values of the related fields
			if ( ! e.target.checked && self.relatedFields[ name ] ) {
				self.relatedFields[ name ].val( '' );
			}
			$( '.action_toggle_menu', self.$row )
				.toggleClass( 'has_values', self.$checkboxes.is( ':checked' ) );
			self.updateValue(); // update the input value
		},

		/**
		 * Handler for select a dynamic value in a popup.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_selectDynamicValue: function( e ) {
			e.preventDefault();
			var self = this,
				$target = $( e.target ),
				value = $target.data( 'dynamic-value' );
			// Reset all buttons in the popup
			self._resetPopupButtons( /* skipDynamicValue */value );
			// Select or cancel the current value
			$target.toggleClass( 'active' );
			if ( $target.hasClass( 'active' ) ) {
				self.setDynamicValue( value );
				$usof.hidePopup( $ush.toString( self.popupId ) ); // hide a popup by its id
			} else {
				self.removeDynamicValue();
			}
			self.updateValue(); // update the input value
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
			var  self = this;
			self.removeDynamicValue();
			self.updateValue(); // update the input value
		},

		/**
		 * Set the dynamic value.
		 *
		 * @param {String} value The dynamic value.
		 */
		setDynamicValue: function( value ) {
			if ( ! value ) {
				return;
			}
			var self = this,
				title = self._dynamicLabels[ value ] || value;
			self.$inputUrl
				.addClass( 'hidden' )
				.val( '' )
				.trigger( 'change' );
			self.$valueSelected
				.data( 'value', value ) // save value
				.removeClass( 'hidden' )
				.find( '.usof-form-input-dynamic-value-title' )
				.attr( 'title', title )
				.text( title );
		},

		/**
		 * Remove a dynamic value.
		 */
		removeDynamicValue: function() {
			var self = this;
			self.$valueSelected
				.data( 'value', /* remove */null )
				.addClass( 'hidden' );
			self.$inputUrl.removeClass( 'hidden' );
		},

		/**
		 * Show/hide the URL search results list.
		 */
		_toggleUrlSearchResults: function( e ) {
			var self = this,
				isFocus = ( e.type === 'focus' ),
				pid = $ush.timeout( function() {
					self.$urlSearchResults.toggleClass( 'hidden', ! isFocus );
					$ush.clearTimeout( pid );
				}, ( isFocus ? 0 : 200 ) );
		},

		/**
		 * Search results list click handler. Sets URL input value to the URL of selected item.
		 */
		_urlSearchResultsSelect: function( e ) {
			var self = this,
				$target = $( e.currentTarget ),
				selectedUrl = $target.data( 'url' ) || '';
			if ( selectedUrl ) {
				self.$inputUrl
					.val( selectedUrl )
					.trigger( 'change' );
				self._urlSearchResultsClear();
			}
		},

		/**
		 * Clear and hide search results list.
		 */
		_urlSearchResultsClear: function() {
			var self = this;

			$ush.timeout( function() {
				// Resetting AJAX calls in case any is running at the moment
				self.urlSearchAjaxQueriesNumber = 0;
				self.$urlSearchResults
					.removeClass( 'loading' )
					.addClass( 'hidden' );
				$( '.usof-link-search-results-item', self.$urlSearchResults )
					.remove();
			}, 200 );
		},

		/**
		 * URL input typing handler. Inits the search with small delay after KeyUp event on the input.
		 */
		_inputUrlKeyUpDown: function( e ) {
			if ( ! e.currentTarget.value ) {
				return;
			}

			var self = this;
			if ( _typingTimer ) {
				$ush.clearTimeout( _typingTimer );
			}
			_typingTimer = $ush.timeout( function() {
				self._urlSearchInit.call( self, e );
				$ush.clearTimeout( _typingTimer );
			}, 1000 ).value;

			// Enter handler
			if ( $ush.toLowerCase( e.key ) === 'enter' ) {
				e.preventDefault();
				var $firstSearchResult = $( '.usof-link-search-results-item:first', self.$urlSearchResults );
				if ( $firstSearchResult.length ) {
					$firstSearchResult.trigger( 'mousedown' );
				} else {
					self.$inputUrl
						.val( '' )
						.trigger( 'change' );
				}
				self.$urlSearchResults.addClass( 'hidden' );
			}
		},

		/**
		 * URL search initialization.
		 */
		_urlSearchInit: function( e ){
			var self = this,
				$input = $( e.currentTarget ),
				value = $ush.toLowerCase( $input.val() ).trim(),
				isUrl = true;

			// Clear previous search results
			$( '.usof-link-search-results-item', self.$urlSearchResults ).remove();
			// Hide notice if it was shown
			self.$urlSearchNotice.addClass( 'hidden' );

			// Do not start search if the value is empty OR starts from one of symbols: #/.
			if (
				value === ''
				|| $.inArray( value.substring( 0, 1 ), [ '#', '/', '.' ] ) !== -1
			) {
				self._urlSearchResultsClear();
				return;
			}

			// Do not start search if the value is a valid URL
			try {
				var _urlObj;
				_urlObj = new URL(value);
			} catch ( _ ) {
				isUrl = false;
			}
			if ( isUrl ) {
				self._urlSearchResultsClear();
				return;
			}

			// Clear pagination params, set search value
			self.urlSearchParams = {
				search: value,
				posts_offset: 0,
				posts_search_completed: 0,
				terms_offset: 0,
				terms_search_completed: 0
			}

			self.$urlSearchResults.show();
			$( '.usof-link-search-results-item', self.$urlSearchResults )
				.remove();

			self._urlSearchAjaxCall();

		},

		/**
		 * URL search iteration on scroll of the search results list.
		 */
		_urlSearchResultsScroll: function( e ) {
			var self = this,
				$target = $( e.currentTarget );
			if (
				// if we are done loading posts and terms...
				// ... or another ajax call is in action right now ...
				// ... do not proceed with another AJAX call
				! self.urlSearchParams.terms_search_completed // if we are done loading posts and terms...
				&& ! self.urlSearchDoingAjax // ... or another ajax call is in action right now -
				// Trigger next AJAX call when scrolling down at the bottom of the list with results
				&& ( $target.scrollTop() + $target.height() ) >= ( e.currentTarget.scrollHeight - 1 )
			) {
				self._urlSearchAjaxCall();
			}
		},

		/**
		 * URL search AJAX call handler.
		 */
		_urlSearchAjaxCall: function() {
			var self = this,
				data = $.extend( {}, self.urlSearcAjaxQueryArgs || {}, self.urlSearchParams );

			self.$urlSearchResults.addClass( 'loading' );
			self.urlSearchDoingAjax = true;
			// Counting each active AJAX call. There may be several concurrent AJAX cals during typing
			self.urlSearchAjaxQueriesNumber++;
			var currentAjaxQueryNumber = self.urlSearchAjaxQueriesNumber;


			$.post( ajaxurl, data, function( res ) {
				// If there were several concurrent AJAX calls during typing, applying the one that was called last
				if ( self.urlSearchAjaxQueriesNumber == currentAjaxQueryNumber ) {

					// Checking if the response was successful and showing error if it was not
					if ( !  res.success ) {
						self.$urlSearchResults.find( '.usof-link-search-results-item' ).remove();
						self.$urlSearchNotice
							.html( res.data.message )
							.removeClass( 'hidden' );
						// If there are results - adding them to the search results list
					} else if (
						res.data.items
						&& res.data.items.length > 0
					) {
						// Add results to list
						$.each( res.data.items, function( index, item ) {
							if ( $.isPlainObject( item ) ) {
								var $item = $( '<div class="usof-link-search-results-item" data-url="' + item.permalink + '">' + item.title + ' <i>' + item.type + '</i></div>' );
								self.$urlSearchResults.append( $item );
							}
						} );
						// If there are no items found, showing the notice for it
					} else if (
						res.data.posts_offset == 0
						&& res.data.terms_offset == 0
						&& res.data.notice
					) {
						$( '.usof-link-search-results-item', self.$urlSearchResults ).remove();
						self.$urlSearchNotice
							.html( res.data.notice )
							.removeClass( 'hidden' );
					}

					// Saving data for possible next iterations of search (made on scroll)
					self.urlSearchParams.posts_offset = res.data.posts_offset;
					self.urlSearchParams.posts_search_completed = res.data.posts_search_completed;
					self.urlSearchParams.terms_offset = res.data.terms_offset;
					self.urlSearchParams.terms_search_completed = res.data.terms_search_completed;

					self.$urlSearchResults.removeClass( 'loading' );

					// Marking that AJAX request is done and resetting concurrent AJAX calls counter
					self.urlSearchDoingAjax = false;
					self.urlSearchAjaxQueriesNumber = 0;
				}

			}, 'json' );
		},

		/**
		 * Update the input value.
		 *
		 * Format:
		 * '{"type":"url","url":"value|{{dynamic_variable}}","title":"value","target":"_blank","rel":"nofollow","onclick":"jsvalue"}'
		 * Note: In configuration and value files, the type can be omitted and values can be written immediately, for
		 * example: '{ "type": "url", "url": "value" }' corresponds to '{ "url": "value" }', this simplifies writing
		 * and keeps the writing format
		 */
		updateValue: function() {
			var self = this,
				result = {};

			// Parsing a dynamic value
			var dynamicValue = self.$valueSelected.data( 'value' );
			if ( dynamicValue ) {
				dynamicValue = ( '' + dynamicValue ).split( '|' );
				result['type'] = $ush.toString( dynamicValue[ /* type */0 ] );
				if ( dynamicValue.length == 2 ) {
					result[ result.type ] = $ush.toString( dynamicValue[ /* value */1 ] );
				}
			}

			// Get all values in to `options` variable
			$( 'input[type!=hidden]', self.$container ).each( function( _, input ) {
				var name = input.name, value = input.value;
				// Exit if there is no name or field is a value for the checkbox
				if ( ! name || _REGEXP_RELATED_FIELD_NAME_.test( name ) ) {
					return;
				}
				// Add values to result
				if ( name == 'url' && ! dynamicValue ) {
					result[ name ] = value;
				}
				else if ( input.type == 'checkbox' ) {
					if ( ! input.checked ) {
						return;
					}
					// Get a value from a related field
					if ( self.relatedFields[ name ] ) {
						value = $ush.toString( self.relatedFields[ name ].val() ).trim();
					}
					result[ name ] = value;
				}
			} );

			// Set the result
			result = $ush.toString( result );
			self.$input.val( result ).trigger( 'change' );
			self.trigger( 'change', [ result ] );
		},

		/**
		 * Get the default value.
		 * Note: This is the default value from the config,
		 * not the default value from the responsive value.
		 *
		 * @return {String} The default value.
		 */
		getDefaultValue: function() {
			var self = this;
			if ( $ush.isUndefined( self._std ) ) {
				return '';
			}
			if ( self.isLiveBuilder() ) {
				return $ush.toString( self._std );
			}
			return self._std
		},

		/**
		 * Get the value.
		 *
		 * @return {String} The value.
		 */
		getValue: function() {
			return this.$input.val() || '';
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value The value.
		 * @param {Boolean} quiet The quiet.
		 *
		 * Format: `url:(value|{{variable}})|title:value|target:_blank|rel:nofollow|onclick:value`
		 * Note: `^` distinguishes a type from a variable!
		 */
		setValue: function( value, quiet ) {
			var self = this,
				data = $ush.toPlainObject( value );

			// Set value to global input
			self.$input.val( '' + value );

			// Hide attributes menu
			this.hideMenu();

			// Set values by field
			if ( ! $.isEmptyObject( data ) ) {
				if ( self.hasDynamicValues ) {
					self.removeDynamicValue();
				}
				// Set the url
				if ( ! isUndefined( data.url ) ) {
					self.$inputUrl
						.val( data.url )
						.trigger( 'change' );
				}

				// Set the dynaminc value
				else if( data.type ) {
					if ( ! isUndefined( data[ data.type ] ) ) {
						data.type += '|' + data[ data.type ];
					}
					self.setDynamicValue( data.type );
				}

				// Set checkboxes
				var setCheckboxes = false;
				$.each( self.$checkboxes, function( _, checkbox ) {
					var name = checkbox.name,
						isChecked = !! data[ name ];

					$( checkbox ).prop( 'checked', isChecked );
					setCheckboxes = setCheckboxes || isChecked;
				} );
				$( '.action_toggle_menu', self.$row ).toggleClass( 'has_values', setCheckboxes );

				// Set values for related fields with checkboxes
				$.each( self.relatedFields, function( name, $value ) {
					if ( ! isUndefined( data[ name ] ) ) {
						$value.val( data[ name ] );
					}
				} );

				self.updateValue(); // update the input value
			}

			if ( ! quiet ) {
				self.trigger( 'change', [ value ] );
			}
		},
	};

}( jQuery );
