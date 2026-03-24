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
	 * @type {{}} Types of notifications
	 */
	// const _NOTIFY_TYPE_ = {
	// 	ERROR: 'error',
	// 	INFO: 'info',
	// 	SUCCESS: 'success'
	// };

	/**
	 * @class Notify - Notification system
	 * @param {String} container The container
	 */
	function Notify( container ) {
		var self = this;

		/**
		 * @type {{}} Bondable events
		 */
		self._events = {
			close: self._close.bind( self )
		};

		$( function() {

			// Elements
			self.$container = $( container );

			// Close notification handler
			$usb.$document.on( 'click', '.usb_action_notification_close', self._events.close );
		});
	}

	// Notify API
	$.extend( Notify.prototype, {
		/**
		 * Determines if ready
		 *
		 * @return {Boolean} True if ready, False otherwise
		 */
		isReady: function() {
			return ! $ush.isUndefined( this.$container );
		},

		/**
		 * Add and display a notification
		 *
		 * @param {String} message The message
		 * @param {String} type The type
		 * TODO: Add display multiple notifications as a list!
		 */
		add: function( message, type ) {
			var self = this,
				// Time after which the notification will be remote
				delayAutoClose = 4000, // 4s
				// Get prototype
				$notification = self.$container
					.clone()
					.removeClass( 'hidden' );
			// Set notification type
			if ( !! type && $usbcore.indexOf( type, _NOTIFY_TYPE_ ) > -1 ) {
				$notification
					.addClass( 'type_' + type );
			}
			// If the notification type is not an error, then add a close timer
			if ( type !== _NOTIFY_TYPE_.ERROR ) {
				$notification
					.addClass( 'auto_close' )
					.data( 'handle', $ush.timeout( function() {
						$notification
							.find( '.usb_action_notification_close' )
							.trigger( 'click' );
					}, delayAutoClose ) );
			}
			// Add message to notification
			$notification
				.find( 'span' )
				.html( '' + message );

			// Add notification
			$usb.$panel
				.append( $notification );
		},

		/**
		 * Close notification handler
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_close: function( e ) {
			var $notification = $( e.target ).closest( '.usb-notification' ),
				handle = $notification.data( 'handle' );
			if ( !! handle ) {
				$ush.clearTimeout( handle );
			}
			$notification.fadeOut( 'fast', function() {
				$notification.remove();
			} );
		},

		/**
		 * Closes all notification
		 */
		closeAll: function() {
			$( '.usb-notification', $usb.$body ).fadeOut( 'fast', function() {
				$( this ).remove();
			} );
		}
	} );

	// Export API
	$usb.notify = new Notify( /*container*/'.usb-notification' );

}( jQuery );
