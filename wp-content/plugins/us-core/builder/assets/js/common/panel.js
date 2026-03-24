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

	if ( ! _window.$usb ) {
		return;
	}

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};
	_window.$usbcore = _window.$usbcore || {};

	/**
	 * @class Panel - Basic panel functionality (left sidebar)
	 * @param {String} container The container
	 */
	function Panel( container ) {
		const self = this;

		// Bondable events
		self._events = {
			switch: self._switch.bind( self ),
			urlManager: self._urlManager.bind( self ),
		};

		$( () => {

			// Elements
			self.$container = $( container );
			self.$header = $( '.usb-panel-header', self.$container );
			self.$title = $( '.usb-panel-header-title', self.$header );
			self.$body = $( '.usb-panel-body', self.$container );
			self.$messages = $( '.usb-panel-messages', self.$container );

			// Actions
			self.$actionSaveChanges = $( '.usb_action_save_changes', self.$container );

			// Events
			self.$container
				// Switch show/hide panel
				.on( 'click', '.usb-panel-switcher', self._events.switch )
				// Save changes to the backend
				.on( 'click', '.usb_action_save_changes', () => {
					$usb.trigger( 'panel.saveChanges' ); // event for react in extensions
				} );
		} );

		// Private events
		$usb
			.on( 'urlManager.changed', self._events.urlManager );
	}

	// Panel API
	$.extend( Panel.prototype, {
		/**
		 * Determines if ready
		 *
		 * @return {Boolean} True if ready, False otherwise
		 */
		isReady: function() {
			return ! $ush.isUndefined( this.$container );
		},

		/**
		 * Determines if show panel
		 *
		 * @return {Boolean} True if show panel, False otherwise
		 */
		isShow: function() {
			return ! $usb.$body.hasClass( 'hide_sidebars' );
		},

		/**
		 * Hide all sections in panel
		 */
		clearBody: function() {
			var self = this;
			self.hideMessage(); // hide section "Messages"
			$usb.trigger( 'panel.clearBody' ); // clear the panel body
		},

		/**
		 * Reset scroll for the panel body
		 */
		resetBodyScroll: function() {
			this.$body[0].scrollTo( /*x*/0, /*y*/0 );
		},

		/**
		 * Set the header title
		 *
		 * @param {String} title The title
		 * @param {Boolean} isTranslationKey Is the key to translation
		 */
		setTitle: function ( title, isTranslationKey ) {
			var self = this;
			if ( self.isReady() && title ) {
				// Get text translation by key
				if ( isTranslationKey ) {
					title = $usb.getTextTranslation( title );
				}
				self.$title.html( typeof title === 'string' ? title : 'no_title' );
			}
		},

		/**
		 * Show the messages
		 *
		 * @param {String} text The message text
		 */
		showMessage: function( text ) {
			var self = this;
			self.clearBody(); // hide all sections
			$usb.trigger( 'panel.showMessage', text );
			self.$messages
				.removeClass( 'hidden' )
				.html( text );
		},

		/**
		 * Hide the message
		 */
		hideMessage: function() {
			var self = this;
			if ( self.isReady() ) {
				self.$messages
					.addClass( 'hidden' )
					.html( '' );
			}
		},

		/**
		 * Switch show/hide panel
		 *
		 * @event handler
		 */
		_switch: function() {
			var self = this;
			// Show/Hide all sidebars (Panel and Navigator)
			$usb.$body.toggleClass( 'hide_sidebars', self.isShow() );
			$usb.trigger( 'panel.switch', self.isShow() );
			$usb.postMessage( 'changeSwitchPanel' ); // send message about change the panel display
		},

		/**
		 * Show the preloader
		 */
		showPreloader: function() {
			this.$container.addClass( 'show_preloader' );
		},

		/**
		 * Hide the preloader
		 */
		hidePreloader: function() {
			this.$container.removeClass( 'show_preloader' );
		},

		/**
		 * Switch for enable/disable save button
		 *
		 * @param {Boolean} enable The enable button
		 * @param {Boolean} isLoading indicates if loading
		 */
		switchSaveButton: function( enable, isLoading ) {
			this.$actionSaveChanges
				.prop( 'disabled', ! enable )
				.toggleClass( 'disabled', ! enable )
				.toggleClass( 'loading', isLoading === true ? enable : false ); // switch for show/hide loading
		},

		/**
		 * Handler of change or move event on the history stack
		 *
		 * @event handler
		 * @param {{}|undefined} state Data object associated with history and current loaction
		 */
		_urlManager: function( state ) {
			const self = this;
			// If the document is not read, exit
			if ( ! self.isReady() ) {
				return;
			}
			var _siteSettings = $usb.config( 'actions.site_settings' );
			if ( state.setParams.action === _siteSettings ) {
				$( '.usb_action_show_add_elms', self.$header ).addClass( 'hidden' );
				$( '.usb_action_go_to_back', self.$header ).removeClass( 'hidden' );
			}
			else if( state.oldParams.action === _siteSettings ) {
				$( '.usb_action_show_add_elms', self.$header ).removeClass( 'hidden' );
				$( '.usb_action_go_to_back', self.$header ).addClass( 'hidden' );
			}
		}
	} );

	// Export API
	$usb.panel = new Panel( /* container */'#usb-panel' );

}( jQuery );
