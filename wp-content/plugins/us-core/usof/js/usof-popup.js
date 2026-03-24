// USOF Popup
;( function( $ ) {

	const _document = document;

	/**
	 * @type {{}} All created popups
	 */
	$usof.popupInstances = {};

	/**
	 * @class USOF_Popup
	 * @param {String} id The unique id of the popup
	 * @param {{}} options The popup options
	 */
	function USOF_Popup( id, options ) {
		const self = this;

		// Elements
		self.$document = $( _document );
		var $body = $( _document.body );

		// Check of popup initialization
		if ( self.inited ) {
			return;
		}
		self.inited = true;

		// Check the variable type
		if ( ! $.isPlainObject( options ) ) {
			options = {};
		}

		// Elements
		self.$container = $( '[data-popup-id="' + id + '"]:first' );
		if ( ! self.$container.length ) {
			return;
		}

		// Options should be passed to the initialization code
		options = $.extend(
			{
				// Default options
				overlay: true, // show the overlay below the popup
				closeOnEsc: false, // close the popup by pressing Escape
				closeOnBgClick: false, // close the popup when user clicks on the dark overlay

				// Default handlers
				// beforeShow: $.noop, // handler is called before the popup show
				// afterShow: $.noop, // handler is called after the popup show
				// beforeHide: $.noop, // handler is called before the popup hide
				// afterHide: $.noop, // handler is called after the popup hide
				// closeOnBtn: $.noop, // handler is called on click on the close button
			},
			options
		);
		self.options = options;

		// Create overlay
		if ( options.overlay ) {
			self.$overlay = self.$container.next( '.usof-popup-overlay:first' );
			if ( ! self.$overlay.length ) {
				self.$overlay = $( '<div class="usof-popup-overlay"></div>' );
				self.$container.after( self.$overlay );
			}
		}

		// Bondable events
		self._events = {
			close: self._close.bind( self ),
			hide: self._hide.bind( self ),
			keydown: self._keydown.bind( self ),
			show: self._show.bind( self ),
		};

		// The close the popup when user clicks on the dark overlay
		if ( options.overlay && options.closeOnBgClick ) {
			self.$overlay.on( 'click', self._events.hide );
		}

		// Events
		self.$document
			// Global events
			.on( 'click', '[data-popup-show="' + id + '"]', self._events.show )
			.on( 'click', '[data-popup-hide="' + id + '"]', self._events.hide )
			// Popup events
			.on( 'click', '[data-popup-id="' + id + '"] .usof-popup-close', self._events.close )
			// Capture keyboard shortcuts
			.on( 'keyup', self._events.keydown );

		// Private events
		self
			.on( 'usof.hidePopup', self._events.hide )
			.on( 'closeOnEsc', self._events.hide );

		// Assign show and hide popup handlers, if any
		[ 'beforeShow', 'afterShow', 'beforeHide', 'afterHide', 'closeOnBtn' ].map( function( name ) {
			if ( typeof options[ name ] === 'function' ) {
				self.on( name, options[ name ].bind( self ) );
			}
		} );

		// Fires after first initialization
		if ( typeof options.init === 'function' ) {
			options.init.call( self );
		}
	}

	// Export API
	$.extend( USOF_Popup.prototype, $usof.mixins.Events, {

		/**
		 * Determines if preloader
		 *
		 * @return {Boolean} True if preloader, False otherwise
		 */
		hasPreloader: function() {
			return this.$container.hasClass( 'preloader' );
		},

		/**
		 * Show the preloader
		 */
		showPreloader: function() {
			this.$container.addClass( 'preloader' );
		},

		/**
		 * Hide the preloader
		 */
		hidePreloader: function() {
			this.$container.removeClass( 'preloader' );
		},

		/**
		 * Determines if show the popup
		 *
		 * @return {Boolean} True if show, False otherwise
		 */
		isShow: function() {
			return this.$container.hasClass( 'show' );
		},

		/**
		 * Show the popup
		 */
		show: function() {
			this._show();
		},

		/**
		 * Show the popup
		 *
		 * @event handler
		 * @return {Boolean} Returns false to stop further execution of event handlers
		 */
		_show: function() {
			var self = this;
			self.trigger( 'beforeShow' );
			self.$container.addClass( 'show' );
			if ( self.options.overlay ) {
				self.$overlay.addClass( 'show' );
			}
			self.trigger( 'afterShow' );
			return false;
		},

		/**
		 * Hide the popup
		 */
		hide: function() {
			this._hide();
		},

		/**
		 * Hide the popup
		 *
		 * @event handler
		 * @return {Boolean} Returns false to stop further execution of event handlers
		 */
		_hide: function() {
			var self = this;
			self.trigger( 'beforeHide' );
			self.$container.removeClass( 'show' );
			if ( self.options.overlay ) {
				self.$overlay.removeClass( 'show' );
			}
			self.trigger( 'afterHide' );
			return false;
		},

		/**
		 * Hide the popup via the button (cross)
		 *
		 * @event handler
		 * @return {Boolean} Returns false to stop further execution of event handlers
		 */
		_close: function() {
			var self = this;
			self._hide(); // hide the popup
			self.trigger( 'closeOnBtn' );
			return false;
		},

		/**
		 * Key press event handler
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_keydown: function( e ) {
			var self = this;
			if (
				self.options.closeOnEsc
				&& self.isShow()
				&& $ush.toLowerCase( e.key ) === 'escape'
			) {
				self.trigger( 'closeOnEsc' );
			}
		}

	} );

	/**
	 * Get popup instance
	 *
	 * @param {String} id The unique popup id
	 * @param {{}} options The popup options
	 * @return {USOF_Popup} The popup instance
	 */
	$usof.popup = function( id, options ) {
		if ( ! id || ! $( '[data-popup-id="' + id + '"]' ).length ) {
			return;
		}
		return $usof.popupInstances[ id ] = new USOF_Popup( id, options );
	};

	/**
	 * Hide the popup if uniqid is set or all if set to true
	 *
	 * @param {String|true} id The unique popup id
	 * @return {Boolean} Returns true if the popup was closed, otherwise false
	 */
	$usof.hidePopup = function( id ) {
		var popups = []; // list of popup IDs to delete
		if ( id === true ) {
			popups = Object.keys( $usof.popupInstances );
		} else if ( ! $ush.isUndefined( $usof.popupInstances[ id ] ) ) {
			popups.push( id );
		}
		if ( popups.length ) {
			popups.map( function( id ) {
				$usof.popupInstances[ id ].trigger( 'usof.hidePopup' );
			} );
			return true;
		}
		return false;
	};

	/**
	 * Wrapper for jQuery
	 *
	 * @return self
	 */
	$.fn.usPopup = function() {
		this.each( function() {
			this.data( 'USOF_Popup', new $usof.popup( this.data( 'popup-id' ) ) );
		} );
	};

})( jQuery );
