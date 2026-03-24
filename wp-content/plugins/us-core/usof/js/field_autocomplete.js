/**
 * USOF Field: Autocomplete
 *
 * For lists that have groups, the search occurs without queries.
 * If a handler is set and the list does not have groups, then loading,
 * searching, and output are performed using AJAX requests.
 */
! function( $, undefined ) {

	// Private variables that are used only in the context of this function, it is necessary to optimize the code.
	var _window = window,
		_undefined = undefined;

	// If the main object does not exist, then exit
	if ( $ush.isUndefined( _window.$usof ) ) {
		return;
	}

	/**
	 * @type {{}} Event KeyCodes
	 */
	const _KEYCODES_ = {
		ENTER: 13,
		ESCAPE: 27
	};

	/**
	 * @var {{}} Private temp data.
	 */
	var _$temp = {
		endOfListReached: false,
		typingTimer: false,
		xhr: _undefined,
	};

	$usof.field[ 'autocomplete' ] = {
		/**
		 * Initializes the object
		 */
		init: function() {
			var self = this;

			// Variables
			self.disableScrollLoad = false;
			self.relatedField;
			self.options = {
				ajax_data: {},
				multiple: false,
				sortable: false,
				value_separator: ',',
				no_results_found: 'No results found.',
				text_in_placeholder: '...',
			};

			/**
			 * @var {{}} Bondable events.
			 */
			self._events = {
				keyup: self._keyup.bind( self ),
				showList: self._showList.bind( self ),
				hideList: self._hideList.bind( self ),
				toggleList: self._toggleList.bind( self ),
				scrollList: self._scrollList.bind( self ),
				searchRequest: self._searchRequest.bind( self ),
				searchItems: self._searchItems.bind( self ),
				selectedValue: self._selectedValue.bind( self ),
				removeSelectedValue: self._removeSelectedValue.bind( self ),
				changeRelatedField: $ush.debounce( self._changeRelatedField.bind( self ), 1 ),
			};

			// Elements
			self.$container = $( '.usof-autocomplete', self.$row );
			self.$options = $( '.usof-autocomplete-options', self.$container );
			self.$search = $( 'input[type="text"]', self.$container );
			self.$toggle = $( '.usof-autocomplete-toggle', self.$container );
			self.$list = $( '.usof-autocomplete-list', self.$container );
			self.$value = $( '> .usof-autocomplete-value', self.$container );
			self.$message = $( '.usof-autocomplete-message', self.$container );

			// Load field options
			if ( self.$container.is( '[onclick]' ) ) {
				$.extend( self.options, self.$container[0].onclick() || {} );
			}
			self.hasAjaxHandler = ! $ush.isUndefined( $ush.toPlainObject( self.options.ajax_data ).action );

			// Events
			self.$container
				.on( 'click', '.usof-autocomplete-list [data-value]', self._events.selectedValue );

			// Handler for clicks outside the field
			if ( self.isMultiple() ) {
				self.$container.on( 'click', '.usof-autocomplete-selected button', self._events.removeSelectedValue );
			} else {
				if ( $( '.usof-autocomplete-selected', self.$options ).length ) {
					self.$container.on( 'click', '.usof-autocomplete-selected:first', self._events.showList );
				} else {
					// Fallback for cases when previous autocomplete value is not present in the list of options
					self.$options.on( 'click', self._events.showList );
				}

			}

			self.$search
				.on( 'keyup', self._events.keyup )
				.on( 'keyup', self._events[ self.hasAjaxHandler ? 'searchRequest' : 'searchItems' ] )
				.on( 'focus', self._events.toggleList );

			// Hide list for different modes
			if ( self.isMultiple() ) {
				self.$toggle.on( 'mouseleave', self._events.hideList );
			} else {
				self.$search.on( 'blur', self._events.toggleList );
			}

			// If there is Ajax loading of data, then we load the data by scroll
			if ( self.hasAjaxHandler ) {
				self.$list.on( 'scroll', self._events.scrollList );

				// Handler for changes to the associated field, if any.
				self.relatedField = self.getRelatedField();
				if ( self.relatedField instanceof $usof.field ) {
					self.relatedField.on( 'change', self._events.changeRelatedField );
				}

				// if there are no options, try load via AJAX
				if ( self.$list.is( ':empty' ) ) {
					// Note: Delay is necessary if there is a value to avoid an abort.
					$ush.timeout( self.getItems.bind( self ), 15 );
				}
			}

			// Init Drag & Drop
			if ( self.isMultiple() && self.options.sortable ) {
				var dragdrop = new $usof.dragDrop( self.$options, '> .usof-autocomplete-selected' )
				dragdrop.on( 'changed', self._saveValue.bind( self ) );
			}
		},

		/**
		 * Determines if multiple.
		 *
		 * @return {Boolean} True if multiple, False otherwise.
		 */
		isMultiple: function() {
			return !! this.options.multiple;
		},

		/**
		 * Request to receive data from the server.
		 *
		 * @param {Function} callback The callback function that will return the result as an argument.
		 * @param {String|[]} itemIds The get list by IDs.
		 */
		getItems: function( callback, itemIds ) {
			var self = this;

			// Abort previous request
			if ( ! $ush.isUndefined( _$temp.xhr ) && ! _$temp.xhr._skipAbort ) {
				_$temp.xhr.abort();
			}

			// Get query arguments
			var queryArgs = self.options.ajax_data;
			if ( ! $.isPlainObject( queryArgs ) ) {
				queryArgs = {};
			}

			// Request data
			var data = $ush.clone( queryArgs );

			// Add search text
			var search = self.$search.val().trim();
			if ( search ) {
				data.search = search;
			}

			// If it's a string, then convert it to an array
			var valueSeparator = self.options.value_separator;
			if ( ! Array.isArray( itemIds ) ) {
				itemIds = $ush.toString( itemIds );
				itemIds = itemIds
					? itemIds.split( valueSeparator )
					: [];
			}

			// Add item ids or offset
			if ( itemIds.length ) {
				data.itemIds = itemIds.join( valueSeparator );
			} else {
				data.offset = $( '[data-value]', self.$list ).length;
			}

			// Set the value of the related field, if any
			if ( self.relatedField instanceof $usof.field ) {
				data[ self.relatedField.name ] = self.relatedField.getCurrentValue();
			}

			self.clearMessage();
			self.$container.addClass( 'loading' );

			// Get list of values
			var valueList = $ush.toString( self.getValue() )
				.split( valueSeparator );

			// Execute request
			// Format items: `[ { value: "value", name: 'name' }, {...}, ... ]`
			_$temp.xhr = $.ajax( {
				data: data,
				dataType: 'json',
				url: $usof.ajaxUrl,
				cache: false,
				success: function( res ) {
					if ( ! res.success ) {
						self._showMessage.call( self, res.data.message );
						return;
					}
					var items = res.data.items;
					if ( ! Array.isArray( items ) ) {
						items = [];
					}
					// Add received items to the general list
					if ( ! itemIds.length ) {
						items.map( function( item ) {
							var itemValue = $ush.toString( item.value );
							var $item = $( '<div>', {
								'data-value': $ush.stripTags( itemValue ),
								'data-text': $ush.stripTags( item.name ),
								'tabindex': 3
							} );
							if ( valueList.indexOf( itemValue ) > -1 ) {
								$item.addClass( 'selected' );
							}
							self.$list.append( $item.html( item.name ) );
						} );
					}

					// Run callback function
					if ( typeof callback === 'function' ) {
						callback.call( self, items );
					}

					// We’ll run an event for watches the data update
					self.trigger( 'data.loaded', res.data.items );
				},
				complete: function( _, textStatus ) {
					if ( textStatus !== 'abort' ) {
						_$temp.xhr = _undefined;
						self.$container.removeClass( 'loading' );
					}
				}
			} );

			// Skip request abort to retrieve selected items
			_$temp.xhr._skipAbort = itemIds.length;
		},

		/**
		 * Send search request to the server.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_searchRequest: function( e ) {
			var self = this;
			if ( _$temp.typingTimer ) {
				$ush.clearTimeout( _$temp.typingTimer );
			}
			_$temp.typingTimer = $ush.timeout( function() {
				self._clearList();

				// Get search items
				self.getItems( function( items ) {
					if ( $.isEmptyObject( items ) ) {
						self.showMessage( self.options.no_results_found );
					}
				} );
				$ush.clearTimeout( _$temp.typingTimer );
			}, 500 );
		},

		/**
		 * Search by existing items.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_searchItems: function( e ) {
			var self = this,
				value = $ush.toLowerCase( e.currentTarget.value );
			self.clearMessage();
			if ( ! value ) {
				$( '.hidden', self.$list ).removeClass( 'hidden' );
				return;
			}
			var $items = $( '[data-value]', self.$list );
			$items
				.addClass( 'hidden' )
				.filter( '[data-text^="'+ value +'"], [data-text*="'+ value +'"]' )
				.removeClass( 'hidden' );
			$( '[data-group]', self.$list ).each( function() {
				var $group = $( this );
				$group.toggleClass( 'hidden', ! $( '[data-value]:not(.hidden)', $group ).length );
			});
			if ( ! $items.is( ':visible' ) ) {
				self.showMessage( self.options.no_results_found );
			}
		},

		/**
		 * Input event handler for Search.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_keyup: function( e ) {
			var self = this;
			if ( e.keyCode === _KEYCODES_.ENTER ) {
				$( '[data-value]:not(.selected):visible:first', self.$list )
					.trigger( 'click' );
			}
			if ( [ _KEYCODES_.ENTER, _KEYCODES_.ESCAPE ].indexOf( e.keyCode ) > -1 ) {
				self.$toggle.removeClass( 'show' );
				self.$search.trigger( 'blur' );
			}
		},

		/**
		 * Show a list when multi-select is enabled.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_showList: function( e ) {
			var self = this;
			self.$toggle.addClass( 'show' );
			self.$search[0].focus();
		},

		/**
		 * Show or hide options list.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_toggleList: function( e ) {
			var self = this,
				isFocus = ( e.type === 'focus' ),
				handle = $ush.timeout( function() {
					self.$toggle.toggleClass( 'show', isFocus );
					$ush.clearTimeout( handle );
				}, ( isFocus ? 0 : 150 /* the delay for the blur event is necessary for the selection script to work out */ ) );
		},

		/**
		 * Handler for hide the list in multiple mode.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_hideList: function( e ) {
			var self = this;
			if (
				self.isMultiple()
				&& self.$toggle.hasClass( 'show' )
			) {
				self.$toggle.removeClass( 'show' );
				self.$search.blur();
			}
		},

		/**
		 * Get next portion of elements when the list is scrolled to its end.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_scrollList: function( e ) {
			var self = this,
				target = e.currentTarget,
				$target = $( target );
			if (
				! _$temp.endOfListReached
				&& $ush.isUndefined( _$temp.xhr )
				&& ( $target.scrollTop() + $target.height() ) >= ( target.scrollHeight - 1 )
			) {
				self.getItems( function( items ) {
					// If the end is reached, mark this to avoid unnecessary requests
					if ( $.isEmptyObject( items ) ) {
						_$temp.endOfListReached = true;
					}
				} );
			}
		},

		/**
		 * Clear list.
		 */
		_clearList: function() {
			_$temp.endOfListReached = false; // reset
			$( '[data-value]', this.$list ).remove();
		},

		/**
		 * Load and show selected values.
		 *
		 * @param {String} value A value or set specified through a separator.
		 */
		_loadSelectedValues: function( value ) {
			var self = this,
				$selected = $( '.usof-autocomplete-selected', self.$options ),
				textInPlaceholder = self.options.text_in_placeholder;
			if ( ! self.hasAjaxHandler || $selected.length ) {
				return;
			}

			// Remove selecteds
			$( '.selected', self.$list ).removeClass( 'selected' );
			$selected.remove();

			// Load and selection of params which are not in the list but must be displayed
			if ( value ) {
				var itemIds = value.split( self.options.value_separator ).map( $.trim );
				// Set placeholders
				self.$options.addClass( 'show_placeholders' );
				itemIds.map( function( id ) {
					self._showSelectedValue( id, textInPlaceholder );
				} );
				self.getItems( function( items ) {
					// Remove placeholders
					$( '.usof-autocomplete-selected', self.$options ).remove();
					self.$options.removeClass( 'show_placeholders' );
					// Set selected values
					var itemLabels = {};
					items.map( function( item ) {
						itemLabels[ item.value ] = item.name;
					} );
					itemIds.map( function( id ) {
						self._showSelectedValue( id, itemLabels[ id ] || id );
					} );
				}, itemIds );
			}
		},

		/**
		 * Show selected values.
		 *
		 * @param {String} value A value or set specified through a separator.
		 */
		_showSelectedValues: function( value ) {
			var self = this,
				$selected = $( '.usof-autocomplete-selected', self.$options );
			if ( $selected.length ) {
				return;
			}

			// Remove selecteds
			$( '.selected', self.$list ).removeClass( 'selected' );
			$selected.remove();

			// Load and selection of params which are not in the list but must be displayed
			if ( value ) {
				var itemIds = value.split( self.options.value_separator );

				itemIds.map( function( itemId ) {
					var label = $( '[data-value="' + itemId + '"]', self.$list ).first().text();
					self._showSelectedValue( itemId, label );
				} );
			}
		},

		/**
		 * Show the selected value.
		 *
		 * @param {String} value The value.
		 * @param {String} label The label.
		 */
		_showSelectedValue: function( value, label ) {
			var self = this;
			if ( ! value ) {
				return;
			}
			if ( ! self.isMultiple() ) {
				$( '.usof-autocomplete-selected', self.$options ).remove();
				$( '.selected', self.$list ).removeClass( 'selected' );
			}
			self.$options.append(
				`<div class="usof-autocomplete-selected">
					` + label + ` <button type="button" class="fas fa-times" data-value="` + value + `"></button>
				</div>`
			);
			$( '[data-value="' + value + '"]:not(.selected)', self.$list )
				.addClass( 'selected' );
		},

		/**
		 * Selected value
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_selectedValue: function( e ) {
			var self = this,
				$target = $( e.currentTarget );
			if ( $target.hasClass( 'selected' ) && self.isMultiple() ) {
				self._removeSelectedValue( e );
				return;
			}
			if ( ! self.isMultiple() ) {
				$( '[data-value]', self.$list ).removeClass( 'selected' );
				$( '.usof-autocomplete-selected', self.$options ).remove();
			}
			var value = $target.data( 'value' );
			self._showSelectedValue( value, /* label */$target.html() );
			self._saveValue();
		},

		/**
		 * Removes a selected value.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_removeSelectedValue: function( e ) {
			var self = this,
				value = $( e.currentTarget ).data( 'value' );
			$( '[data-value="' + value + '"]', self.$list )
				.removeClass( 'selected' );
			$( '[data-value="' + value + '"]', self.$options )
				.parent().remove();
			self._saveValue();
		},

		/**
		 * Save selected values.
		 */
		_saveValue: function() {
			var self = this,
				value = [];
			$( '[data-value]', self.$options ).each( function( _, node ) {
				value.push( $( node ).data( 'value' ) );
			} );
			self.setValue( value.join( self.options.value_separator ) );
		},

		/**
		 * Handler for changes in the related field.
		 *
		 * @event handler
		 */
		_changeRelatedField: $ush.debounce( function() {
			var self = this;
			// Reset values if there are no requests
			if ( $ush.isUndefined( _$temp.xhr ) ) {
				$( '.usof-autocomplete-selected', self.$options ).remove();
				$( '.selected', self.$list ).removeClass( 'selected' );
				self.$value.val( '' );
				self.trigger( 'change' );
			}
			// Update list
			self._clearList();
			self.getItems( function( items ) {
				if ( $.isEmptyObject( items ) ) {
					self.showMessage( self.options.no_results_found );
				}
			} );
		}, 1 ),

		/**
		 * Show the message.
		 *
		 * @param {String} text The message text.
		 */
		showMessage: function( text ) {
			var self = this;
			self.$list.addClass( 'hidden' );
			self.$message
				.text( text )
				.removeClass( 'hidden' );
		},

		/**
		 * Clear this message.
		 */
		clearMessage: function() {
			var self = this;
			self.$list.removeClass( 'hidden' );
			self.$message
				.addClass( 'hidden' )
				.text( '' );
		},

		/**
		 * Get value.
		 *
		 * @return {String} Returns field value.
		 */
		getValue: function() {
			var self = this;

			// Regular scenario, getting the value after field init
			if ( self.$value instanceof $ ) {
				return self.$value.val();

				// Fallback to get default value before field init
			} else {
				var $value = $( '.usof-autocomplete-value', self.$row )
				return ( $value.length ) ? $value.val() : '';
			}
		},

		/**
		 * Set value.
		 *
		 * @param {String} value The value.
		 * @param {Boolean} quiet The quiet.
		 */
		setValue: function( value, quiet ) {
			var self = this;
			self.$value.val( value );
			// If values are loaded via AJAX - load full info for selected value ...
			if ( self.hasAjaxHandler ) {
				if ( value ) {
					self._loadSelectedValues( value );
				}
				// ... and if values are passed via config, just show the values
			} else {
				self._showSelectedValues( value );
			}
			if ( ! quiet ) {
				self.trigger( 'change', [ value ] );
			}
		}
	};

}( jQuery );
