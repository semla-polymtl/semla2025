/**
 * UpSolution Element: List Filter
 */
! function( $, _undefined ) {
	"use strict";

	const abs = Math.abs;
	const max = Math.max;
	const min = Math.min;
	const urlManager = $ush.urlManager();
	const PREFIX_FOR_URL_PARAM = '_';
	const RANGE_VALUES_BY_DEFAULT = [ 0, 1000 ];
	const DELETE_FILTER = null;

	let lastResult;

	/**
	 * @param {String} values The values.
	 * @return {[]} Returns an array of range values.
	 */
	function parseValues( values ) {
		values = $ush.toString( values );
		if ( ! values || ! values.includes( '-' ) ) {
			return RANGE_VALUES_BY_DEFAULT;
		}
		return values.split( '-' ).map( $ush.parseFloat );
	}

	/**
	 * @param {Node} container.
	 */
	function usListFilter( container ) {
		const self = this;

		// Private "Variables"
		self.settings = {
			mobileWidth: 600,
		};
		self.$filters = {};
		self.result = {};

		// Bondable events
		self._events = {
			applyFilterToList: $ush.debounce( self.applyFilterToList.bind( self ), 1 ),
			checkScreenStates: $ush.debounce( self.checkScreenStates.bind( self ), 10 ),
			closeMobileFilters: self.closeMobileFilters.bind( self ),
			getItemValues: self.getItemValues.bind( self ),
			hideItemDropdown: self.hideItemDropdown.bind( self ),
			openMobileFilters: self.openMobileFilters.bind( self ),
			resetItemValues: self.resetItemValues.bind( self ),
			searchItemValues: self.searchItemValues.bind( self ),
			toggleItemDropdown: self.toggleItemDropdown.bind( self ),
			toggleItemSection: self.toggleItemSection.bind( self ),
		};

		// Elements
		self.$container = $( container );
		self.$pageContent = $( 'main#page-content' );

		// Gets element settings
		if ( self.$container.is( '[onclick]' ) ) {
			$.extend( self.settings, self.$container[0].onclick() || {} );
		}

		// Init DatePicker https://api.jqueryui.com/datepicker/
		$( '.type_date_picker', container ).each( ( _, filter ) => {
			let $start = $( 'input:eq(0)', filter ),
				$end = $( 'input:eq(1)', filter ),
				$startContainer = $start.parent(),
				$endContainer = $start.parent(),
				startOptions = {},
				endOptions = {};

			if ( $startContainer.is( '[onclick]' ) ) {
				startOptions = $startContainer[0].onclick() || {};
			}
			if ( $endContainer.is( '[onclick]' ) ) {
				endOptions = $endContainer[0].onclick() || {};
			}

			$start.datepicker( $.extend( true, {
				isRTL: $ush.isRtl(),
				dateFormat: $start.data( 'date-format' ),
				beforeShow: ( _, inst ) => {
					inst.dpDiv.addClass( 'for_list_filter' );
				},
				onSelect: () => {
					$start.trigger( 'change' );
				},
				onClose: ( _, inst ) => {
					$end.datepicker( 'option', 'minDate', inst.input.datepicker( 'getDate' ) || null );
				},
			}, startOptions ) );

			$end.datepicker( $.extend( true, {
				isRTL: $ush.isRtl(),
				dateFormat: $end.data( 'date-format' ),
				beforeShow: ( _, inst ) => {
					inst.dpDiv.addClass( 'for_list_filter' );
				},
				onSelect: () => {
					$start.trigger( 'change' );
				},
				onClose: ( _, inst ) => {
					$start.datepicker( 'option', 'maxDate', inst.input.datepicker( 'getDate' ) || null );
				},
			}, endOptions ) );
		} );

		// Init Range Slider https://api.jqueryui.com/slider/
		$( '.type_range_slider', container ).each( ( _, filter ) => {
			function showFormattedResult( _, ui ) {
				$( '.for_min_value, .for_max_value', filter ).each( ( i, node ) => {
					let value = $ush.toString( ui.values[ i ] );
					if ( options.numberFormat ) {
						var numberFormat = $ush.toPlainObject( options.numberFormat ),
							decimals = $ush.parseInt( abs( numberFormat.decimals ) );
						if ( decimals ) {
							value = $ush.toString( $ush.parseFloat( value ).toFixed( decimals ) )
								.replace( /^(\d+)(\.)(\d+)$/, '$1' + numberFormat.decimal_separator + '$3' );
						}
						value = value.replace( /\B(?=(\d{3})+(?!\d))/g, numberFormat.thousand_separator );
					}
					$( node ).html( $ush.toString( options.unitFormat ).replace( '%d', value ) );
				} );
			}

			let $slider = $( '.ui-slider', filter );
			let options = {
				slider: {
					animate: true,
					min: RANGE_VALUES_BY_DEFAULT[0],
					max: RANGE_VALUES_BY_DEFAULT[1],
					range: true,
					step: 10,
					values: RANGE_VALUES_BY_DEFAULT,
					slide: showFormattedResult,
					change: showFormattedResult,
					stop: $ush.debounce( ( _, ui ) => {
						$( 'input[type=hidden]', filter )
							.val( ui.values.join( '-' ) )
							.trigger( 'change' );
					} ),
				},
				unitFormat: '%d', // example: $0 000.00
				numberFormat: null, // example: 0 000.00
			};
			if ( $slider.is( '[onclick]' ) ) {
				options = $.extend( true, options, $slider[0].onclick() || {} );
			}
			$slider.removeAttr( 'onclick' ).slider( options.slider );
		} );

		// Setup the UI
		if ( self.changeURLParams() ) {
			$( '[data-name]', self.container ).each( ( _, filter ) => {
				let $filter = $( filter ),
					name = $filter.data( 'name' ),
					compare = $ush.toString( $filter.data( 'value-compare' ) );
				if ( compare ) {
					compare = `|${compare}`;
				}
				self.$filters[ name + compare ] = $filter;
			});
			self.setupFields();
			urlManager.on( 'popstate', () => {
				self.setupFields();
				self.applyFilterToList();
			} );
		}

		// Events
		$( '.w-filter-item', container )
			.on( 'change', 'input:not([name=search_values]), select', self._events.getItemValues )
			.on( 'input change', 'input[name=search_values]', self._events.searchItemValues )
			.on( 'click', '.w-filter-item-reset', self._events.resetItemValues )
			.on( 'click', '.w-filter-item-title', self._events.toggleItemDropdown )
			.on( 'click', '.w-filter-item-title', self._events.toggleItemSection );
		self.$container
			.on( 'click', '.w-filter-opener', self._events.openMobileFilters )
			.on( 'click', '.w-filter-list-closer, .w-filter-button-submit', self._events.closeMobileFilters );
		$us.$window
			.on( 'resize', self._events.checkScreenStates )

		// Hide dropdowns of all items on click outside any item title
		if ( self.$container.hasClass( 'drop_on_click' ) ) {
			$us.$document.on( 'click', self._events.hideItemDropdown );
		}

		self.on( 'applyFilterToList', self._events.applyFilterToList );

		self.checkScreenStates();
		self.сheckActiveFilters();
	}

	// List Filter API
	$.extend( usListFilter.prototype, $ush.mixinEvents, {

		/**
		 * Determines if enabled URL.
		 *
		 * @return {Boolean} True if enabled url, False otherwise.
		 */
		changeURLParams: function() {
			return this.$container.hasClass( 'change_url_params' );
		},

		/**
		 * Setup fields.
		 */
		setupFields: function() {
			const self = this;
			$.each( self.$filters, ( name, $filter ) => {
				self.resetFields( $filter );

				name = PREFIX_FOR_URL_PARAM + name;
				if ( ! urlManager.has( name ) ) {
					delete self.result[ name ];
					return;
				}

				let values = $ush.toString( urlManager.get( name ) );
				values.split( ',' ).map( ( value, i ) => {
					if ( $filter.hasClass( 'type_dropdown' ) ) {
						$( `select`, $filter ).val( value );

					} else if ( $filter.hasClass( 'type_date_picker' ) ) {
						let $input = $( `input:eq(${i})`, $filter );
						if ( $input.length && /\d{4}-\d{2}-\d{2}/.test( value ) ) {
							$input.val( $.datepicker.formatDate( $input.data( 'date-format' ), $.datepicker.parseDate( 'yy-mm-dd', value ) ) );
						}

					} else if ( $filter.hasClass( 'type_range_input' ) ) {
						if ( /([\.?\d]+)-([\.?\d]+)/.test( value ) ) {
							$( 'input', $filter ).each( ( i, input ) => { input.value = parseValues( value )[ i ] } );
						}

					} else if ( $filter.hasClass( 'type_range_slider' ) ) {
						if ( /([\.?\d]+)-([\.?\d]+)/.test( value ) ) {
							$( '.ui-slider', $filter ).slider( 'values', parseValues( value ) );
							$( `input[type=hidden]`, $filter ).val( value );
						}

						// For type_checkbox and type_radio
					} else {
						$( `input[value="${value}"]`, $filter ).prop( 'checked', true );
					}
				} );

				self.result[ name ] = values;

				$filter.addClass( 'has_value open' );
			} );

			self.showSelectedValues();
		},

		/**
		 * Search field to narrow choices.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		searchItemValues: function( e ) {

			const $filter = $( e.delegateTarget );
			const $items = $( '[data-value]', $filter );
			const value = $ush.toLowerCase( e.target.value ).trim();

			$items
				.filter( ( _, node ) => { return ! $( 'input', node ).is(':checked') } )
				.toggleClass( 'hidden', !! value );

			if ( $filter.hasClass( 'type_radio' ) ) {
				const $buttonAnyValue = $( '[data-value="*"]:first', $filter );
				if ( ! $( 'input', $buttonAnyValue ).is(':checked') ) {
					$buttonAnyValue
						.toggleClass( 'hidden', ! $ush.toLowerCase( $buttonAnyValue.text() ).includes( value ) );
				}
			}

			if ( value ) {
				$items
					.filter( ( _, node ) => { return $ush.toLowerCase( $( node ).text() ).includes( value ) } )
					.removeClass( 'hidden' )
					.length;
			}

			$( '.w-filter-item-message', $filter ).toggleClass( 'hidden', $items.is( ':visible' ) );
		},

		/**
		 * Get result from single filter item.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		getItemValues: function( e ) {
			const self = this;

			let $filter = $( e.delegateTarget ),
				name = PREFIX_FOR_URL_PARAM + $ush.toString( $filter.data( 'name' ) ),
				compare = $filter.data( 'value-compare' ),
				value = e.target.value;

			if ( compare ) {
				name += `|${compare}`;
			}

			// TYPE: Checkboxes
			if ( $filter.hasClass( 'type_checkbox' ) ) {
				let values = [];
				$( 'input:checked', $filter ).each( ( _, input ) => {
					values.push( input.value );
				});

				if ( ! values.length ) {
					self.result[ name ] = DELETE_FILTER;
				} else {
					self.result[ name ] = values.toString();
				}

				// TYPE: Date Picker
			} else if ( $filter.hasClass( 'type_date_picker' ) ) {
				let values = [];
				$( 'input.hasDatepicker', $filter ).each( ( i, input ) => {
					values[ i ] = $.datepicker.formatDate( 'yy-mm-dd', $( input ).datepicker( 'getDate' ) );
				} );

				if ( ! values.length ) {
					self.result[ name ] = DELETE_FILTER;
				} else {
					self.result[ name ] = values.toString();
				}

				// TYPE: Range input
			} else if ( $filter.hasClass( 'type_range_input' ) ) {
				let defaultValues = [], values = [];
				$( 'input', $filter ).each( ( i, input ) => {
					defaultValues[ i ] = input.dataset.value;
					values[ i ] = input.value || defaultValues[ i ];
				} );
				if ( ! values.length || values.toString() === defaultValues.toString() ) {
					self.result[ name ] = DELETE_FILTER;
				} else {
					self.result[ name ] = values.join( '-' );
				}

				// TYPE: Radio buttons and Dropdown
			} else {
				if ( $ush.rawurldecode( value ) === '*' ) {
					self.result[ name ] = DELETE_FILTER;
				} else {
					self.result[ name ] = value;
				}
			}

			self.trigger( 'applyFilterToList' );
			self.showSelectedValues();

			$filter.toggleClass( 'has_value open', !! self.result[ name ] );
		},

		/**
		 * Reset values of single item
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		resetItemValues: function( e ) {
			const self = this;

			e.stopPropagation();
			e.preventDefault();

			let $filter = $( e.delegateTarget ),
				name = PREFIX_FOR_URL_PARAM + $filter.data( 'name' ),
				compare = $filter.data( 'value-compare' );

			if ( compare ) {
				name += `|${compare}`;
			}
			self.result[ name ] = DELETE_FILTER;

			self.trigger( 'applyFilterToList' );
			self.resetFields( $filter );
		},

		/**
		 * Reset filter fields.
		 *
		 * @param {Node} $filter
		 */
		resetFields: function( $filter ) {
			const self = this;

			if ( $filter.hasClass( 'type_checkbox' ) ) {
				$( 'input[type=checkbox]', $filter ).prop( 'checked', false );

			} else if ( $filter.hasClass( 'type_radio' ) ) {
				$( 'input[type=radio]:first', $filter ).prop( 'checked', true );

			} else if ( $filter.hasClass( 'type_dropdown' ) ) {
				$( 'select', $filter ).prop( 'selectedIndex', 0 );

			} else if (
				$filter.hasClass( 'type_date_picker' )
				|| $filter.hasClass( 'type_range_input' )
			) {
				$( 'input', $filter ).val( '' );

			} else if ( $filter.hasClass( 'type_range_slider' ) ) {
				let $input = $( 'input[type=hidden]', $filter ),
					values = [
						$input.attr( 'min' ),
						$input.attr( 'max' )
					];
				$( '.ui-slider', $filter ).slider( 'values', values.map( $ush.parseFloat ) );
			}

			if ( self.$container.hasClass( 'mod_dropdown' ) ) {
				$( '.w-filter-item-title span', $filter ).text( '' );
			}

			$filter.removeClass( 'has_value' );

			$( 'input[name="search_values"]', $filter ).val( '' );
			$( '.w-filter-item-value', $filter ).removeClass( 'hidden' );
		},

		/**
		 * Apply filters to first Post/Product List.
		 *
		 * @event handler
		 */
		applyFilterToList: function() {
			const self = this;
			if (
				! $ush.isUndefined( lastResult )
				&& $ush.comparePlainObject( self.result, lastResult )
			) {
				return;
			}
			lastResult = $ush.clone( self.result );

			if ( self.changeURLParams() ) {
				urlManager.set( self.result );
				urlManager.push( {} );
			}

			let $firstList = $( `
				.w-grid.us_post_list:visible,
				.w-grid.us_product_list:visible,
				.w-grid-none:visible
			`, self.$pageContent ).first();

			if ( $firstList.hasClass( 'w-grid-none' ) ) {
				$firstList = $firstList.prev();
			}

			$firstList.trigger( 'usListFilter', self.result );

			self.сheckActiveFilters();
		},

		/**
		 * Toggle a filter item section.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		toggleItemSection: function( e ) {
			if ( this.$container.hasClass( 'mod_toggle' ) ) {
				const $filter = $( e.delegateTarget );
				$filter.toggleClass( 'open', ! $filter.hasClass( 'open' ) );
			}
		},

		/**
		 * Toggle a filter item section.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		toggleItemDropdown: function( e ) {
			if ( this.$container.hasClass( 'mod_dropdown' ) ) {
				const $filter = $( e.delegateTarget );
				$filter.toggleClass( 'dropped', ! $filter.hasClass( 'dropped' ) );
			}
		},

		/**
		 * Open mobile version.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		openMobileFilters: function( e ) {
			$us.$body.addClass( 'us_filter_open' );
			this.$container.addClass( 'open' );
		},

		/**
		 * Close mobile version.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		closeMobileFilters: function() {
			$us.$body.removeClass( 'us_filter_open' );
			this.$container.removeClass( 'open' );
		},

		/**
		 * Shows the selected values.
		 */
		showSelectedValues: function() {
			const self = this;
			if ( ! self.$container.hasClass( 'mod_dropdown' ) ) {
				return;
			}
			for ( const key in self.result ) {
				const name = ( key.charAt(0) === '_' )
					? key.substring(1)
					: key;
				let value = self.result[ key ];
				if ( ( lastResult || {} )[ key ] === value || $ush.isUndefined( value ) ) {
					continue
				}
				const $filter = self.$filters[ name ];
				const $label = $( '.w-filter-item-title span', $filter );
				if ( value === null ) {
					$label.text( '' );

				} else if ( $filter.hasClass( 'type_dropdown' ) ) {
					$label.text( ': ' + $( `option[value="${value}"]`, $filter ).text() );

				} else if ( $filter.hasClass( 'type_range_slider' ) || $filter.hasClass( 'type_range_input' ) ) {
					$label.text( `: ${self.result[ key ]}` );

				} else if ( $filter.hasClass( 'type_date_picker' ) ) {
					const values = [];
					$( 'input.hasDatepicker', $filter ).each( ( _, input ) => {
						if ( input.value ) {
							values.push( input.value );
						}
					} );
					$label.text( ': ' + values.join( ' - ' ) );

				} else {
					if ( value.includes( ',' ) ) {
						value = value.split( ',' ).length;
					} else {
						value = $( `[data-value="${value}"] .w-filter-item-value-label`, $filter ).text();
					}
					$label.text( `: ${value}` );
				}
			}
		},

		/**
		 * Hide dropped content of every filter item with Dropdown layout.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		hideItemDropdown: function( e ) {
			const self = this;
			const $openedFilters = $( '.w-filter-item.dropped', self.$container );
			if ( ! $openedFilters.length ) {
				return;
			}
			$openedFilters.each( ( _, node ) => {
				const $node = $( node );
				if ( ! $node.is( e.target ) && $node.has( e.target ).length === 0 ) {
					$node.removeClass( 'dropped' );
				}
			} );
		},

		/**
		 * Check screen states.
		 *
		 * @event handler
		 */
		checkScreenStates: function() {
			const self = this;
			const isMobile = $ush.parseInt( window.innerWidth ) <= $ush.parseInt( self.settings.mobileWidth );

			if ( ! self.$container.hasClass( `state_${ isMobile ? 'mobile' : 'desktop' }` ) ) {
				self.$container.usMod( 'state', isMobile ? 'mobile' : 'desktop' );
				if ( ! isMobile ) {
					$us.$body.removeClass( 'us_filter_open' );
					self.$container.removeClass( 'open' );
				}
			}
		},

		/**
		 * Check active filters.
		 */
		сheckActiveFilters: function() {
			const self = this;
			self.$container.toggleClass( 'active', $( '.has_value:first', self.$container ).length > 0 );
		},

	} );

	$.fn.usListFilter = function() {
		return this.each( ( _, node ) => {
			$( node ).data( 'usListFilter', new usListFilter( node ) );
		} );
	};

	$( () => {
		$( '.w-filter.for_list' ).usListFilter();
	} );

}( jQuery );
