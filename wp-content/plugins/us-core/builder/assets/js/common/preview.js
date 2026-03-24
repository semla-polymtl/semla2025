/**
 * Available spaces:
 *
 * _window.$usb - Basic object for mounting and initializing all extensions of the builder
 * _window.$usbcore - Auxiliary functions for the builder and his extensions
 * _window.$ush - US Helper Library
 *
 * Note: Double underscore `__funcname` is introduced for functions that are created through `$ush.debounce(...)`.
 */
! function( $, undefined ) {
	var _window = window;

	// Math API
	var ceil = Math.ceil,
		max = Math.max;

	if ( ! _window.$usb ) {
		return;
	}

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};
	_window.$usbcore = _window.$usbcore || {};

	/**
	 * @type {String} Default responsive screen name
	 */
	const _DEFAULT_RESPONSIVE_SCREEN_ = 'default';

	/**
	 * @type {{}} Private temp data
	 */
	var _$tmp = {
		currentResponsiveScreen: 'default', // current responsive screen
		resizeControlWidth: 20, // resize-control width for preview adjustment
	};

	/**
	 * @class Preview - Functionality of the preview and responsive screens area
	 * @param {String} container The container
	 */
	function Preview( container ) {
		var self = this;

		/**
		 * @type {{}} Bondable events
		 */
		self._events = {
			endResize: self._endResize.bind( self ),
			hideToolbar: self._hideToolbar.bind( self ),
			maybeResize: self._maybeResize.bind( self ),
			maybeStartResize: self._maybeStartResize.bind( self ),
			switchResponsiveScreen: self._switchResponsiveScreen.bind( self ),
			switchToolbar: self._switchToolbar.bind( self ),
			urlManager: self._urlManager.bind( self ),
		};

		$( function() {

			// Elements
			self.$container = $( container );
			self.$screen = $( '.usb-preview-screen', self.$container );
			self.$wrapper = $( '.usb-preview-wrapper', self.$container );
			self.$inputWidth = $( 'input[name=screenWidth]', self.$container );
			self.$inputHeight = $( 'input[name=screenHeight]', self.$container );

			// Actions
			self.$actionSwitchToolbar = $( '.usb_action_switch_toolbar', $usb.$panel );

			// Get and set the width of the resize-control
			_$tmp.resizeControlWidth = $ush.parseInt( $( '[data-resize-control]', self.$screen ).width() );

			// Events
			self.$container
				// Handler for exit the screen view
				.on( 'click', '.usb_action_hide_toolbar', self._events.hideToolbar )
				// Handler for switch screen name on the toolbar
				.on( 'click', '[data-responsive-state]', self._events.switchResponsiveScreen );

			$usb.$document
				// Track preview screen resize events
				.on( 'mousedown', '[data-resize-control]', self._events.maybeStartResize )
				.on( 'mousemove', self._events.maybeResize )
				.on( 'mouseup', self._events.endResize );

			$usb.$panel
				.on( 'click', '.usb_action_switch_toolbar', self._events.switchToolbar );

			// Run URL manager after ready
			self._urlManager( $usb.urlManager.getDataOfChange() );
		});

		// Private events
		$usb
			.on( 'urlManager.changed', self._events.urlManager ); // URL history stack change handler

		// Handler for screen synchronization in $usof objects
		self.on( 'document.syncResponsiveState', function( screenName ) {
			if ( self.isScreenName( screenName ) ) {
				$usb.triggerDocument( 'syncResponsiveState', screenName );
			}
		} );
	}

	/**
	 * @type {Prototype}
	 */
	var prototype = Preview.prototype;

	// Responsive API
	$.extend( prototype, $ush.mixinEvents, {
		/**
		 * Determines if ready
		 *
		 * @return {Boolean} True if ready, False otherwise
		 */
		isReady: function() {
			return ! $ush.isUndefined( this.$container );
		},

		/**
		 * Determines if active responsive screens
		 *
		 * @return {Boolean} True if active responsive screens, False otherwise
		 */
		isShow: function() {
			return $usb.urlManager.hasParam( 'screen' );
		},

		/**
		 * Show the preloader
		 */
		showPreloader: function() {
			this.$wrapper.addClass( 'show_preloader' );
		},

		/**
		 * Hide the preloader
		 */
		hidePreloader: function() {
			this.$wrapper.removeClass( 'show_preloader' );
		},

		/**
		 * Determines whether the specified screen is screen name
		 *
		 * @param {String} screen The screen
		 * @return {String} True if the specified screen is valid, False otherwise
		 */
		isScreenName: function( screen ) {
			return screen && $usbcore.indexOf( screen, $usb.config( 'responsiveStates', [] ) ) > -1;
		},

		/**
		 * Get the current preview iframe offset
		 *
		 * @return {{}} Returns the offset along the X and Y axes
		 */
		getCurrentOffset: function() {
			var rect = $ush.$rect( $usb.iframe );
			return {
				y: rect.y || 0,
				x: rect.x || 0
			};
		},

		/**
		 * Handler of change or move event on the history stack
		 *
		 * @event handler
		 * @param {{}|undefined} state Data object associated with history and current loaction
		 */
		_urlManager: function( state ) {
			var self = this,
				currentScreen = state.setParams.screen;
			if (
				// If the document is not read, exit
				! self.isReady()
				// If the screen has not changed and show, exit
				|| (
					currentScreen === _$tmp.currentResponsiveScreen
					&& self.$container.hasClass( 'responsive_mode' )
				)
			) {
				return;
			}
			// Show toolbar
			if ( currentScreen ) {
				self.showToolbar( currentScreen );
			}
			// Hide toolbar
			else if ( state.oldParams.screen ) {
				self.hideToolbar();
			}
		},

		/**
		 * Show the toolbar controls
		 *
		 * @param {String} screen The screen name
		 */
		showToolbar: function( screen ) {
			var self = this;
			self.$container.addClass( 'responsive_mode' ); // hide toolbar
			self.$actionSwitchToolbar.addClass( 'active' ); // deactivate button
			self.setResponsiveScreen( screen || _DEFAULT_RESPONSIVE_SCREEN_ ); // set default responsive screen
		},

		/**
		 * Hide toolbar controls
		 */
		hideToolbar: function() {
			var self = this;
			self.$container.removeClass( 'responsive_mode' ); // hide toolbar
			self.$actionSwitchToolbar.removeClass( 'active' ); // deactivate button
			self.setResponsiveScreen( _DEFAULT_RESPONSIVE_SCREEN_ ); // set default responsive screen
			self.$screen.removeAttr( 'style').removeData( '_width' ); // reset for screen
			$usb.$iframe.removeAttr( 'style' ); // reset for iframe
		},

		/**
		 * Hide toolbar controls
		 *
		 * @event handler
		 */
		_hideToolbar: function() {
			$usb.urlManager.removeParam( 'screen' ).push();
		},

		/**
		 * Show/Hide toolbar controls
		 *
		 * @event handler
		 */
		_switchToolbar: function() {
			var self = this,
				urlManager = $usb.urlManager;
			if ( ! self.isShow() ) {
				urlManager.setParam( 'screen', _DEFAULT_RESPONSIVE_SCREEN_ );
			} else {
				urlManager.removeParam( 'screen' );
			}
			urlManager.push();
		},

		/**
		 * Switch responsive screen
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_switchResponsiveScreen: function( e ) {
			var screen = $usbcore.$attr( e.target, 'data-responsive-state' );
			this.setResponsiveScreen( screen ); // set responsive screen
			$usb.urlManager.setParam( 'screen', screen ).push();
		},

		/**
		 * Set screen width and input value
		 *
		 * @param {Number} Width The width
		 */
		_setScreenWidth: function( width ) {
			var self = this,
				// Get controls width (Sum of left and right)
				resizeControlWidth = _$tmp.resizeControlWidth * 2,
				// Get breakpoint settings
				breakpoint = $usb.config( 'breakpoints.' + _$tmp.currentResponsiveScreen, /* default */{} ),
				// Maximum width for the current screen
				maxWidth = $ush.parseInt( breakpoint.max_width ) + resizeControlWidth,
				// Minimum width for the current screen
				minWidth = max( $ush.parseInt( breakpoint.min_width ), $ush.parseInt( $usb.config( 'preview.minHeight' ) ) ) + resizeControlWidth;

			// Check and get width within valid range
			if ( width >= maxWidth) {
				width = maxWidth;
			}
			if ( width <= minWidth ) {
				width = minWidth;
			}

			// Set the width for resize nodes
			self.$inputWidth.val( width - resizeControlWidth );
			self.$screen.css( 'width', width );
		},

		/**
		 * Set responsive screen
		 *
		 * @param {String} screen The screen name
		 */
		setResponsiveScreen: function( screen ) {
			var self = this;
			// Check if the screen name is correct
			if ( ! self.isScreenName( screen ) ) {
				return;
			}

			// Set current mod
			self.$wrapper.usMod( 'responsive_state', screen );

			// Screen synchronization in $usof objects
			self.trigger( 'document.syncResponsiveState', screen );

			// Activate button in the toolbar controls
			$( '[data-responsive-state]', self.$container )
				.removeClass( 'active' )
				.filter( '[data-responsive-state="' + screen + '"]' )
				.addClass( 'active' );

			// Save current screen name
			_$tmp.currentResponsiveScreen = screen;

			// Get control width
			var resizeControlWidth = _$tmp.resizeControlWidth;

			// If there is no value, set the default screen height
			if ( ! self.$inputHeight.val() ) {
				self.$inputHeight.val( $ush.parseInt( self.$screen.height() ) - resizeControlWidth || '' );
			}

			// Get screen width
			var containerWidth = $ush.parseInt( self.$container.width() ),
				width = ( $usb.config( 'breakpoints.' + screen + '.breakpoint' ) || containerWidth ) + ( resizeControlWidth * 2 );
			if ( width >= containerWidth ) {
				width = containerWidth;
			}

			// Set screen width and height
			self._setScreenWidth( width );
			self.$inputHeight.val( ceil( $usb.$iframe.height() ) );
		},

		/**
		 * Set the current responsive screen for $usof fields selected for edit
		 * Note: For support $usof.field
		 *
		 * @type debounced
		 */
		setFieldResponsiveScreen: $ush.debounce( function() {
			var self = this;
			if ( self.isShow() ) {
				// Screen synchronization in $usof objects
				self.trigger( 'document.syncResponsiveState', _$tmp.currentResponsiveScreen );
			}
		}, 100 ),

		/**
		 * Handler for set a responsive screen from $usof the field
		 * Note: For support $usof.field
		 *
		 * @param {String} screen The screen name
		 */
		fieldSetResponsiveScreen: function( screen ) {
			var self = this;
			// Show toolbar
			if ( ! self.isShow() ) {
				self.showToolbar( screen );
			} else {
				self.setResponsiveScreen( screen ); // set responsive screen
			}
			$usb.urlManager.setParam( 'screen', screen ).push();
		},

		/**
		 * Resize start handler
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_maybeStartResize: function( e ) {
			var self = this;
			// Determines if hide responsive toolbar
			if ( ! self.isShow() ) {
				return;
			}
			// Save the start data
			var $screen = self.$screen;
			$usbcore.cache( 'temp' ).set( 'resizeData', {
				resizeControl: $usbcore.$attr( e.target, 'data-resize-control' ),
				startHeight: $ush.parseInt( $screen.height() ),
				startWidth: $ush.parseInt( $screen.width() ),
				startPageX: e.pageX,
				startPageY: e.pageY
			} );
			$screen.addClass( 'resizable' ); // enable screen resize mode
		},

		/**
		 * Resize handler
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_maybeResize: function( e ) {
			var self = this;
			// Determines if hide responsive toolbar
			if ( ! self.isShow() ) {
				return;
			}
			// Get resize data
			var resizeData = $usbcore.cache( 'temp' ).data().resizeData; // object reference
			if ( $.isEmptyObject( resizeData || {} ) ) {
				return;
			}

			var // Get width of horizontal and vertical control
				resizeControlWidth = _$tmp.resizeControlWidth,
				// Get or determine the panel resizeControl
				resizeControl = resizeData.resizeControl,
				isRightControl = resizeControl == 'right';

			// Calculate the width value
			if ( resizeControl == 'left' || isRightControl ) {
				var pageX = e.pageX,
					// Get offset by x-axis
					// Note: `self.$screen` must have the alignment `margin: 0 auto` what is included in the calculation
					offsetX = ( resizeData.startPageX - pageX ) /* for centered */* 2,
					// Get screen width
					width = (
						isRightControl
							? resizeData.startWidth - offsetX // moving the right control
							: resizeData.startWidth + offsetX // moving the left control
					);

				// When the window limit is reached, if the mouse moves further, then we
				// emulate an offset based on the screen width to the maximum width
				var currentResponsiveScreen = _$tmp.currentResponsiveScreen;
				if ( currentResponsiveScreen == _DEFAULT_RESPONSIVE_SCREEN_ ) {
					var maxWidth = $ush.parseInt( $usb.config( 'breakpoints.' + currentResponsiveScreen + '.max_width' ) ),
						windowWidth = ( _window.innerWidth - 1 );
					if (
						maxWidth
						&& windowWidth < maxWidth
						&& ( ! pageX || pageX == windowWidth )
					) {
						width = $ush.parseInt( self.$screen.width() ) + /* virtual offset */10;
						// Reset the starting position values for correct
						// calculation when the window is reduced
						if ( width >= maxWidth ) {
							resizeData.startWidth = maxWidth + resizeControlWidth;
							resizeData.startPageX = 0;
						}
					}
				}

				// Set screen width and input value
				self._setScreenWidth( width );
			}

			// Calculate the height value
			if ( resizeControl == 'bottom' ) {
				// Get current iframe height
				var height = resizeData.startHeight - ( resizeData.startPageY - e.pageY );

				// Check allowed minimum height for screen (add control width to exclude it)
				var minHeight = $usb.config( 'preview.minHeight', /* default */320 ) + resizeControlWidth;
				if ( height < minHeight ) {
					height = minHeight;
				}

				// Check the maximum wrapper height
				var wrapperHeight = $ush.parseInt( self.$wrapper.height() );
				if ( wrapperHeight && height > wrapperHeight ) {
					height = wrapperHeight;
				}

				// Set max-height in input field and preview
				self.$inputHeight.val( height - resizeControlWidth );
				self.$screen.css( 'height', height );
			}
		},

		/**
		 * Resize completion handler
		 *
		 * @event handler
		 */
		_endResize: function() {
			var self = this;
			// Determines if hide responsive toolbar
			if ( ! self.isShow() ) {
				return;
			}
			// Disable screen resize mode
			self.$screen.removeClass( 'resizable' );
			$usbcore.cache( 'temp' ).remove( 'resizeData' ); // remove data from the cache
		}
	} );

	// Export API
	$usb.preview = new Preview( /* container */'#usb-preview' );

} ( jQuery );
