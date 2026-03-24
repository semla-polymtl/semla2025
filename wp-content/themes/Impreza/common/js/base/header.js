/**
 * Base class to working with a $us.header.
 * Dev note: should be initialized after $us.canvas
 */
! function( $, undefined ) {
	"use strict";

	// Private variables that are used only in the context of this function, it is necessary to optimize the code.
	var _window = window,
		_undefined = undefined;

	// Check for is set objects
	_window.$ush = _window.$ush || {};
	_window.$us.canvas = _window.$us.canvas || {};

	/**
	 * Convert data from PHP to boolean the right way
	 *
	 * @param {*} value
	 * @returns {Boolean}
	 */
	function toBoolean( value ) {
		if ( typeof value == 'boolean' ) {
			return value;
		}
		if ( typeof value == 'string' ) {
			value = value.trim();
			return value.toLocaleLowerCase() == 'true' || value == '1';
		}
		return !! parseInt( value );
	}

	/**
	 * @class USHeader
	 *
	 * @param {{}} settings - The header settings
	 */
	function USHeader( settings ) {
		var self = this;

		// Elements
		self.$container = $( '.l-header', $us.$canvas );
		self.$showBtn = $( '.w-header-show:first', $us.$body );

		// Variables
		self.settings = settings || {};

		self.state = 'default'; // possible values: default|laptops|tablets|mobiles
		self.$elms = {};

		// Calculates offset for tables, mobiles bars
		self.canvasOffset = 0;

		// Save body height for tall vertical headers
		self.bodyHeight = $us.$body.height();

		// Sets admin bar height
		self.adminBarHeight = 0;

		// Data for the current states of various settings.
		self._states = {
			init_height: 0,
			scroll_direction: 'down',
			sticky: false,
			sticky_auto_hide: false,
			vertical_scrollable: false
		};

		if ( self.$container.length === 0 ) {
			return;
		}

		// Get init height
		self._states.init_height = self.getHeight();

		self.$places = {
			hidden: $( '.l-subheader.for_hidden', self.$container )
		};

		// Screen Width Breakpoints (Defaults)
		self.breakpoints = {
			laptops: 1280,
			tablets: 1024,
			mobiles: 600
		};
		// Get breakpoint from config
		for ( var k in self.breakpoints ) {
			self.breakpoints[ k ] = parseInt( ( ( settings[ k ] || {} ).options || {} ).breakpoint ) || self.breakpoints[ k ];
		}

		// Get all places in the header
		$( '.l-subheader-cell', self.$container ).each( function( _, place ) {
			var $place = $( place ),
				key = $place.parent().parent().usMod( 'at' ) + '_' + $place.usMod( 'at' );
			self.$places[ key ] = $place;
		} );

		// Get all header elements and save them into the this.$elms list
		// example: menu:1, text:1, socials:1 etc.
		$( '[class*=ush_]', self.$container ).each( function( _, elm ) {
			var $elm = $( elm ),
				// Regular expression to find elements in the header via class names
				matches = /(^| )ush_([a-z_]+)_([0-9]+)(\s|$)/.exec( elm.className );
			if ( ! matches ) {
				return;
			}
			var id = matches[ 2 ] + ':' + matches[ 3 ];
			self.$elms[ id ] = $elm;
			// If the element is a wrapper, store it into the this.$places list.
			if ( $elm.is( '.w-vwrapper, .w-hwrapper' ) ) {
				self.$places[ id ] = $elm;
			}
		} );

		// Events
		$us.$window
			.on( 'scroll', $ush.debounce( self._events.scroll.bind( self ), 1 ) )
			.on( 'resize load', $ush.debounce( self._events.resize.bind( self ), 1 ) );
		self.$container
			.on( 'contentChange', self._events.contentChange.bind( self ) );
		self.$showBtn
			.on( 'click', self._events.showBtn.bind( self ) );
		self // Private events
			.on( 'changeSticky', self._events._changeSticky.bind( self ) )
			.on( 'swichVerticalScrollable', self._events._swichVerticalScrollable.bind( self ) );

		self.setState( 'default', true );
		self._events.resize.call( self );

		// If auto-hide is enabled, then add a class for the css styles to work correctly.
		if ( self.isStickyAutoHideEnabled() ) {
			self.$container
				.addClass( 'sticky_auto_hide' );
		}

		// Triggering an event in the internal event system, this will allow subscribing
		// to external scripts to understand when the animation ends in the header.
		self.$container
			.on( 'transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', $ush.debounce( function() {
				self.trigger.call( self, 'transitionEnd' );
			}, 1 ) );
	}

	// Export API
	$.extend( USHeader.prototype, $us.mixins.Events, {

		/**
		 * Previous scroll position to determine the direction of scrolling.
		 * @var {Number}
		 */
		prevScrollTop: 0,

		/**
		 * Checks if given state is current state.
		 *
		 * @param {String} state State to be compared with.
		 * @return {Boolean} True if the state matches, False otherwise.
		 */
		currentStateIs: function( state ) {
			var self = this;
			return ( state && ( ['default'].concat( Object.keys( self.breakpoints ) ) ).indexOf( state ) !== - 1 && self.state === state );
		},

		/**
		 * Determines if the header is vertical.
		 *
		 * @return {Boolean} True if vertical, False otherwise.
		 */
		isVertical: function() {
			return this.orientation === 'ver';
		},

		/**
		 * Determines if the header is horizontal.
		 *
		 * @return {Boolean} True if horizontal, False otherwise.
		 */
		isHorizontal: function() {
			return this.orientation === 'hor';
		},

		/**
		 * Determines if the header is fixed.
		 *
		 * @return {Boolean} True if fixed, False otherwise.
		 */
		isFixed: function() {
			return this.pos === 'fixed';
		},

		/**
		 * Determines if the header is static.
		 *
		 * @return {Boolean} True if static, False otherwise.
		 */
		isStatic: function() {
			return this.pos === 'static';
		},

		/**
		 * Determines if the header is transparent.
		 *
		 * @return {Boolean} True if transparent, False otherwise.
		 */
		isTransparent: function() {
			return this.bg === 'transparent';
		},

		/**
		 * Safari overscroll Fix.
		 *
		 * @param {Number} scrollTop The scroll top.
		 * @return {Boolean} True if within scroll boundaries, False otherwise.
		 */
		_isWithinScrollBoundaries: function( scrollTop ) {
			scrollTop = Math.ceil( scrollTop );
			return ( scrollTop + _window.innerHeight >= $us.$document.height() ) || scrollTop <= 0;
		},

		/**
		 * Check if the header is hidden.
		 *
		 * @return {Boolean} True if hidden, False otherwise.
		 */
		isHidden: function() {
			return !! $us.header.settings.is_hidden;
		},

		/**
		 * Check if sticky is enabled.
		 *
		 * @return {Boolean} True if sticky is enabled, False otherwise.
		 */
		isStickyEnabled: function() {
			var self = this;
			return ( ( self.settings[ self.state ] || {} ).options || {} ).sticky || false;
		},

		/**
		 * Check if sticky auto hide is enabled.
		 *
		 * @return {Boolean} True if sticky auto hide is enabled, False otherwise.
		 */
		isStickyAutoHideEnabled: function() {
			var self = this;
			return self.isStickyEnabled() && ( ( ( self.settings[ self.state ] || {} ).options || {} ).sticky_auto_hide || false );
		},

		/**
		 * Check if sticky.
		 *
		 * @return {Boolean} True if sticky, False otherwise.
		 */
		isSticky: function() {
			return this._states.sticky || false;
		},

		/**
		 * Check if the header is in automatic hide state.
		 *
		 * @return {Boolean} True if in automatic hide state, False otherwise.
		 */
		isStickyAutoHidden: function() {
			return this._states.sticky_auto_hide || false;
		},

		/**
		 * Get the given start position of the header.
		 * Note: This property is from the Page Layout.
		 *
		 * @return {String} Returns the given initial position.
		 */
		getHeaderInitialPos: function() {
			return $us.$body.usMod( 'headerinpos' ) || ''; // possible values: empty|bottom|above|below
		},

		/**
		 * Get the scroll direction.
		 *
		 * @return {String} Scroll direction.
		 */
		getScrollDirection: function() {
			return this._states.scroll_direction || 'down';
		},

		/**
		 * Get the header height in px.
		 *
		 * This method returns the actual height of the header taking into account
		 * all settings in the current position.
		 *
		 * @return {Number} The header height.
		 */
		getHeight: function() {
			var self = this;

			// If there is no header container, we return `0`
			if ( ! self.$container.length ) {
				return 0;
			}

			// Get height value for .l-header through pseudo-element css ( content: 'value' );
			var beforeContent = getComputedStyle( self.$container.get( 0 ), ':before' ).content,
				height = 0;

			// This approach is used to determine the correct height if there are lazy-load images in the header.
			if ( beforeContent && ['none', 'auto'].indexOf( beforeContent ) === - 1 ) {
				// Delete all characters except numbers
				height = beforeContent.replace( /[^+\d]/g, '' );
			}

			// This is an alternative height if there is no data from css, this option does not work
			// correctly if the header contains images from lazy-load, but it still makes the header work more reliable.
			// Note: Used in a vertical header that ignores pseudo-element :before!
			if ( ! height ) {
				height = self.$container.outerHeight();
			}

			return ! isNaN( height )
				? $ush.parseFloat( height )
				: 0;
		},

		/**
		 * Get the initial height.
		 *
		 * @return {Number} Initial height.
		 */
		getInitHeight: function() {
			var self = this;
			return parseInt( self._states.init_height ) || self.getHeight();
		},

		/**
		 * Get current header height in px.
		 *
		 * This method returns the height of the header,
		 * taking into account all settings that may affect the height at the time of the call of the current method.
		 *
		 * @param {Boolean} adminBar Include the height of the admin bar in the result if it exists
		 * @return {Number} Current header height + admin bar height if displayed.
		 */
		getCurrentHeight: function( adminBar ) {
			var self = this,
				height = 0;

			// If there is an admin bar, add its height to the height
			if (
				adminBar
				&& self.isHorizontal()
				&& (
					! self.currentStateIs( 'mobiles' )
					|| ( self.adminBarHeight && self.adminBarHeight >= self.getScrollTop() )
				)
			) {
				height += self.adminBarHeight;
			}

			// Adding the header height if it is not hidden
			if ( ! self.isStickyAutoHidden() ) {
				height += self.getHeight();
			}

			return height;
		},

		/**
		 * Get the scroll top.
		 *
		 * In this method, the scroll position includes an additional check of the previous value.
		 *
		 * @return {Number} Scroll top.
		 */
		getScrollTop: function() {
			return $us.$window.scrollTop() || this.prevScrollTop;
		},

		/**
		 * Previous offset from the top.
		 * @var {Number}
		 */
		prevOffsetTop: 0,

		/**
		 * Get the offset top.
		 *
		 * @return {Number} The offset top.
		 */
		getOffsetTop: function() {
			var self = this;
			var top = parseFloat( self.$container.css( 'top' ) || 0 );
			return ( self.prevOffsetTop = Math.max( self.prevOffsetTop, top ) );
		},

		/**
		 * Determines if scroll at the top position.
		 *
		 * @return {Boolean} True if scroll at the top position, False otherwise.
		 */
		isScrollAtTopPosition: function() {
			return $ush.parseInt( $us.$window.scrollTop() ) === 0;
		},

		/**
		 * Set the state.
		 *
		 * @param {String} state The new state
		 */
		setState: function( state, force ) {
			var self = this;
			if (  ! force && self.currentStateIs( state ) ) {
				return;
			}

			var options = ( self.settings[ state ] || {} ).options || {},
				orientation = options.orientation || 'hor',
				pos = toBoolean( options.sticky ) ? 'fixed' : 'static',
				bg = toBoolean( options.transparent ) ? 'transparent' : 'solid',
				shadow = options.shadow || 'thin';

			if ( orientation === 'ver' ) {
				pos = 'fixed';
				bg = 'solid';
			}

			// Dev note: don't change the order: orientation -> pos -> bg -> layout
			self._setOrientation( orientation );
			self._setPos( pos );
			self._setBg( bg );
			self._setShadow( shadow );
			self._setLayout( ( self.settings[ state ] || {} ).layout || {} );
			$us.$body.usMod( 'state', self.state = state );

			if ( self.currentStateIs( 'default' ) || self.currentStateIs( 'laptops' ) ) {
				$us.$body.removeClass( 'header-show' );
			}

			// Updating the menu because of dependencies
			if ( $us.nav !== _undefined ) {
				$us.nav.resize();
			}

			if ( self.isStickyAutoHideEnabled() ) {
				self.$container.removeClass( 'down' );
			}
		},

		/**
		 * Set new position.
		 *
		 * @param {String} pos New position (possible values: fixed|static).
		 */
		_setPos: function( pos ) {
			var self = this;
			if ( pos === self.pos ) {
				return;
			}
			self.$container.usMod( 'pos', self.pos = pos );
			if ( self.pos === 'static' ) {
				self.trigger( 'changeSticky', false );
			}
		},

		/**
		 * Set the background.
		 *
		 * @param {String} bg New background (possible values: solid|transparent).
		 */
		_setBg: function( bg ) {
			var self = this;
			if ( bg != self.bg ) {
				self.$container.usMod( 'bg', self.bg = bg );
			}
		},

		/**
		 * Set the shadow.
		 *
		 * @param {String} shadow New shadow (possible values: none|thin|wide).
		 */
		_setShadow: function( shadow ) {
			var self = this;
			if ( shadow != self.shadow ) {
				self.$container.usMod( 'shadow', self.shadow = shadow );
			}
		},

		/**
		 * Set the layout.
		 *
		 * @param {String} value New layout.
		 */
		_setLayout: function( layout ) {
			var self = this;
			for ( var place in layout ) {
				if ( ! layout[ place ] || ! self.$places[ place ] ) {
					// The case when the wrapper is hidden on all states,
					// but has elements that can be visible on a certain state
					if ( place.indexOf( 'wrapper' ) > -1 ) {
						self.$places[ place ] = self.$places['hidden'];
					} else {
						continue;
					}
				}
				self._placeElements( layout[ place ], self.$places[ place ] );
			}
		},

		/**
		 * Sets the orientation.
		 *
		 * @param {String} orientation New orientation ( possible values: hor|ver ).
		 */
		_setOrientation: function( orientation ) {
			var self = this;
			if ( orientation != self.orientation ) {
				$us.$body.usMod( 'header', self.orientation = orientation );
			}
		},

		/**
		 * Recursive function to place elements based on their ids.
		 *
		 * @param {[]} elms This is a list of all the elements in the header.
		 * @param {jQuery} $place
		 */
		_placeElements: function( elms, $place ) {
			var self = this;
			for ( var i = 0; i < elms.length; i ++ ) {
				var elmId;
				if ( typeof elms[ i ] == 'object' ) {
					// Wrapper
					elmId = elms[ i ][ 0 ];
					if ( ! self.$places[ elmId ] || ! self.$elms[ elmId ] ) {
						continue;
					}
					self.$elms[ elmId ].appendTo( $place );
					self._placeElements( elms[ i ].shift(), self.$places[ elmId ] );
				} else {
					// Element
					elmId = elms[ i ];
					if ( ! self.$elms[ elmId ] ) {
						continue;
					}
					self.$elms[ elmId ].appendTo( $place );
				}
			}
		},

		/**
		 * Check vertical scrolling capability for the header.
		 *
		 * This method compares the header height and the window height.
		 * and optionally enables or disables scrolling for the header content.
		 */
		_isVerticalScrollable: function() {
			var self = this;
			if ( ! self.isVertical() ) {
				return;
			}

			if (
				(
					self.currentStateIs( 'default' )
					|| self.currentStateIs( 'laptops' )
				)
				&& self.isFixed()
			) {
				// Initially, let's add a class to override the styles and get the correct values.
				self.$container.addClass( 'scrollable' );

				var headerHeight = self.getHeight(),
					canvasHeight = parseInt( $us.canvas.winHeight ),
					documentHeight = parseInt( $us.$document.height() );

				// Removing a class after getting all values.
				self.$container.removeClass( 'scrollable' );

				// Tolerance is needed to avoid incorrect display when browser zoom is enabled.
				if ( ( headerHeight / canvasHeight ) > 1.05 ) {
					self.trigger( 'swichVerticalScrollable', true );

				} else if ( self._states.vertical_scrollable ) {
					self.trigger( 'swichVerticalScrollable', false );
				}

				if ( ( headerHeight / documentHeight ) > 1.05 ) {
					self.$container.css( {
						position: 'absolute',
						top: 0
					} );
				}

				// Remove ability to scroll header.
			} else if ( self._states.vertical_scrollable ) {
				self.trigger( 'swichVerticalScrollable', false );
			}
		},

		/**
		 * Event handlers
		 */
		_events: {
			/**
			 * Switch vertical scroll for the header.
			 *
			 * @param {{}} _ The self object.
			 * @param {Boolean} state Is scrollable.
			 */
			_swichVerticalScrollable: function( _, state ) {
				var self = this;
				self.$container
					.toggleClass( 'scrollable', self._states.vertical_scrollable = !! state );
				if ( ! self._states.vertical_scrollable ) {
					self.$container
						.resetInlineCSS( 'position', 'top', 'bottom' );
					delete self._headerScrollRange;
				}
			},

			/**
			 * Change the state of the sticky header.
			 *
			 * @param {{}} _ The self object.
			 * @param {Boolean} state Is sticky.
			 */
			_changeSticky: function( _, state ) {
				var self = this;

				self._states.sticky = !! state;
				var currentHeight = self.getCurrentHeight( /* adminBar */true ),
					resetCss = [ 'position', 'top', 'bottom' ];

				// Ignoring top padding reset when using `headerinpos=bottom` in Page Layout
				if (
					$us.canvas.hasStickyFirstSection()
					&& self.getHeaderInitialPos() == 'bottom'
					&& ! self.isStickyAutoHideEnabled()
				) {
					resetCss = resetCss.filter( function( value ) { return value !== 'top' })
				}

				self.$container
					.toggleClass( 'sticky', self._states.sticky )
					// Reset the indent if it was set.
					.resetInlineCSS( resetCss );
				// If the height of the header after sticky does not change, we will fire an
				// event so that additional libraries know that the change has occurred.
				if ( currentHeight == self.getCurrentHeight( /* adminBar */true ) ) {
					self.trigger( 'transitionEnd' );
				}
			},

			/**
			 * Content change event
			 */
			contentChange: function() {
				var self = this;
				self._isVerticalScrollable.call( self );
			},

			/**
			 * Show the button
			 *
			 * @param {Event} e The jQuery event object.
			 */
			showBtn: function( e ) {
				var self = this;
				if ( $us.$body.hasClass( 'header-show' ) ) {
					return;
				}
				e.stopPropagation();
				$us.$body
					.addClass( 'header-show' )
					.on( ( $.isMobile ? 'touchstart' : 'click' ), self._events.hideMobileVerticalHeader.bind( self ) );
			},

			/**
			 * Hide mobile vertical header.
			 *
			 * @param {Event} e The jQuery event object.
			 */
			hideMobileVerticalHeader: function( e ) {
				var self = this;
				if ( $.contains( self.$container[ 0 ], e.target ) ) {
					return;
				}
				$us.$body
					.off( ( $.isMobile ? 'touchstart' : 'click' ), self._events.hideMobileVerticalHeader.bind( self ) );
				$ush.timeout( function() {
					$us.$body.removeClass( 'header-show' );
				}, 10 );
			},

			/**
			 * Page scroll event.
			 *
			 * Dev note: This event is fired very often when the page is scrolled.
			 */
			scroll: function() {
				var self = this,
					// Get the current scroll position.
					scrollTop = self.getScrollTop(),
					// The header is hidden but when scrolling appears at the top of the page.
					headerAbovePosition = ( self.getHeaderInitialPos() === 'above' );

				// Case `this.prevScrollTop == scrollTop` must be excluded, since we will not be able
				// to determine the direction correctly. And this can cause crashes.
				if ( self.prevScrollTop != scrollTop ) {
					// Saving scroll direction
					self._states.scroll_direction = ( self.prevScrollTop <= scrollTop )
						? 'down'
						: 'up';
				}
				self.prevScrollTop = scrollTop;

				// Check if the scroll is in the `up` position,
				// if so, forcibly set scroll direction to 'up' so the header is shown.
				if ( self.isScrollAtTopPosition() ) {
					self._states.scroll_direction = 'up';
				}

				// Sets the class of the scroll state by which the header will be either shown or hidden.
				if (
					self.isStickyAutoHideEnabled()
					&& self.isSticky()
					&& ! self._isWithinScrollBoundaries( scrollTop )
					&& ! headerAbovePosition
				) {
					self._states.sticky_auto_hide = ( self.getScrollDirection() === 'down' );
					self.$container.toggleClass( 'down', self._states.sticky_auto_hide );
				}

				// If the position of the header is not fixed, then we will abort following processing.
				if ( ! self.isFixed() ) {
					return;
				}

				// Header is attached to the first section bottom or below position.
				var headerAttachedFirstSection = ['bottom', 'below'].indexOf( self.getHeaderInitialPos() ) !== - 1;

				// Logic for a horizontal header located at the top of the page.
				if (
					self.isHorizontal()
					&& (
						headerAbovePosition
						|| (
							// Forced for tablets and mobiles devices. This is done in order to avoid on small screens
							// mismatched cases with a mobile menu and other header elements when it is NOT on top.
							headerAttachedFirstSection
							&& (
								self.currentStateIs( 'tablets' )
								|| self.currentStateIs( 'mobiles' )
							)
						)
						|| ! headerAttachedFirstSection
					)
				) {
					if ( self.isStickyEnabled() ) {
						// We observe the movement of the scroll and when the change breakpoint is reached, we will
						// launch the event.
						var scrollBreakpoint = parseInt( ( ( self.settings[ self.state ] || {} ).options || {} ).scroll_breakpoint ) || /* Default */100,
							isSticky = Math.ceil( scrollTop ) >= scrollBreakpoint;
						if ( isSticky != self.isSticky() ) {
							self.trigger( 'changeSticky', isSticky );
						}
					}

					// Additional check for delay scroll position as working with the DOM can take time.
					if ( self.isSticky() ) {
						if ( ! $us.$window.scrollTop() ) {
							self.trigger( 'changeSticky', false );
						}
					}
				}

				// Logic for a horizontal header located at the bottom or below the first section,
				// these checks only work for default (desktop) and laptops devices.
				if (
					self.isHorizontal()
					&& headerAttachedFirstSection
					&& ! headerAbovePosition
					&& (
						self.currentStateIs( 'default' )
						|| self.currentStateIs( 'laptops' )
					)
				) {
					// The height of the first section for placing the header under it.
					var top = ( $us.canvas.getHeightFirstSection() + self.adminBarHeight );

					// The calculate height of the header from the height of the first section
					// so that it is at the bottom of the first section.
					if ( self.getHeaderInitialPos() == 'bottom' ) {
						top -= self.getInitHeight();
					}

					// Checking the position of the header relative to the scroll to sticky it at the page top.
					if ( self.isStickyEnabled() ) {
						var isSticky = scrollTop >= top;
						if ( isSticky != self.isSticky() ) {
							self.trigger( 'changeSticky', isSticky );
						}
					}

					// Sets the heading padding if the heading should be placed at the bottom or below the first
					// section.
					if ( ! self.isSticky() && top != self.getOffsetTop() ) {
						self.$container.css( 'top', top );
					}
				}

				// Logic for a vertical header located on the left or right,
				// with content scrolling implemented.
				if (
					self.isVertical()
					&& ! headerAttachedFirstSection
					&& ! headerAbovePosition
					&& self._states.vertical_scrollable
				) {
					var headerHeight = self.getHeight(),
						documentHeight = parseInt( $us.$document.height() );

					// If the header is taller than whole document
					if ( documentHeight > headerHeight ) {
						var canvasHeight = parseInt( $us.canvas.winHeight ) + self.canvasOffset,
							scrollRangeDiff = ( headerHeight - canvasHeight ),
							cssProps;

						if ( self._headerScrollRange === _undefined ) {
							self._headerScrollRange = [ 0, scrollRangeDiff ];
						}

						// If the header is shorter than content - process 3 states
						if ( self.bodyHeight > headerHeight ) {
							// 1 stage - fixed to top
							if ( scrollTop < self._headerScrollRange[ 0 ] ) {
								self._headerScrollRange[ 0 ] = Math.max( 0, scrollTop );
								self._headerScrollRange[ 1 ] = ( self._headerScrollRange[ 0 ] + scrollRangeDiff );
								cssProps = {
									position: 'fixed',
									top: self.adminBarHeight
								};
								// 2 stage - scrolling with document
							} else if (
								self._headerScrollRange[ 0 ] < scrollTop
								&& scrollTop < self._headerScrollRange[ 1 ]
							) {
								cssProps = {
									position: 'absolute',
									top: self._headerScrollRange[ 0 ]
								};
								// 3 stage - fixed to bottom
							} else if ( self._headerScrollRange[ 1 ] <= scrollTop ) {
								self._headerScrollRange[ 1 ] = Math.min( documentHeight - canvasHeight, scrollTop );
								self._headerScrollRange[ 0 ] = ( self._headerScrollRange[ 1 ] - scrollRangeDiff );
								cssProps = {
									position: 'fixed',
									top: ( canvasHeight - headerHeight )
								};
							}
							// If the header is taller than content, it should allways scroll with document
						} else {
							cssProps = {
								position: 'absolute',
								top: self.adminBarHeight,
							};
						}

						// Add styles from variable cssProps.
						if ( cssProps ) {
							self.$container.css( cssProps );
						}
					}
				}
			},

			/**
			 * This method is called every time the browser window is resized.
			 */
			resize: function() {
				var self = this;

				// Determine the state based on the current size of the browser window.
				var newState = 'default';
				for ( var state in self.breakpoints ) {
					if ( _window.innerWidth <= self.breakpoints[ state ] ) {
						newState = state;
					} else {
						break;
					}
				}
				self.setState( newState || 'default', false );

				self.canvasOffset = $us.$window.outerHeight() - $us.$window.innerHeight();
				self.bodyHeight = $us.$body.height();
				self.adminBarHeight = $us.getAdminBarHeight() || 0;

				// Stop all transitions of CSS animations
				if ( self.isFixed() && self.isHorizontal() ) {
					self.$container.addClass( 'notransition' );

					// Remove class with a small delay to prevent css glitch.
					$ush.timeout( function() {
						self.$container.removeClass( 'notransition' );
					}, 50 );
				}

				self._isVerticalScrollable.call( self );
				self._events.scroll.call( self );
			}
		}
	} );

	window.USHeader = USHeader;

	// Init header.
	$us.header = new USHeader( $us.headerSettings || {} );
}( window.jQuery );
