/**
 * Remove Video Overlay on click
 */
;( function( $, undefined ) {

	// Global variable for YouTube player API objects
	window.$us.YTPlayers = window.$us.YTPlayers || {};

	"use strict";
	/* @class wVideo */
	$us.wVideo = function( container ) {
		var self = this;

		// Elements
		self.$container = $( container );
		self.$videoH = $( '.w-video-h', self.$container );
		self.$videoTag = '';

		// Cookies for the GDPR Compliance
		self.cookieName = self.$container.data( 'cookie-name' );

		// Determines if video has overlay
		self.isWithOverlay = self.$container.hasClass( 'with_overlay' );

		// Prevent action
		if (
			! self.cookieName
			&& ! self.isWithOverlay
		) {
			return;
		}

		// Variables
		self.data = {};

		// Get data for initializing the player
		if ( self.$container.is( '[onclick]' ) ) {
			self.data = self.$container[0].onclick() || {};
			// Delete data everywhere except for the preview of the USBuilder, the data may be needed again to restore the elements.
			if ( ! $us.usbPreview() ) self.$container.removeAttr( 'onclick' );
		}

		/**
		 * @var {{}} Bondable events.
		 */
		self._events = {
			hideOverlay: self._hideOverlay.bind( self ),
			confirm: self._confirm.bind( self )
		};

		// Initialization via confirmations
		if ( self.cookieName ) {
			self.$container
				.on( 'click', '.action_confirm_load', self._events.confirm );
		}

		self.$container
			.one( 'click', '> *', self._events.hideOverlay );
	};

	// Export API
	$.extend( $us.wVideo.prototype, {
		/**
		 * Video Player initialization handler after confirmation
		 *
		 * @event handler
		 */
		_confirm: function() {
			var self = this;

			// Save permission to loading maps in cookies
			if ( $( 'input[name^=' + self.cookieName + ']:checked', self.$container ).length ) {
				$ush.setCookie( self.cookieName, /* value */1, /* days */365 );
			}

			if ( self.isWithOverlay ) {
				self.insertPlayer();
			} else {
				self.$videoH
					// Add video html markup to element
					.html( $ush.base64Decode( '' + $( 'script[type="text/template"]', self.$container ).text() ) )
					.removeAttr( 'data-cookie-name' );
			}
		},

		/**
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_hideOverlay: function( e ) {
			e.preventDefault();
			var self = this;

			// Remove overlay.
			if ( self.$container.is( '.with_overlay' ) ) {
				self.$container
					.removeAttr( 'style' )
					.removeClass( 'with_overlay' );
			}

			// Add player to document.
			if ( ! self.cookieName ) {
				self.insertPlayer();
			}
		},

		/**
		 * Add player to document.
		 */
		insertPlayer: function() {
			var self = this,
				data = $.extend( { player_id: '', player_api: '', player_html: '' }, self.data || {} ); // Get player data.

			// If there is no API in the document yet, then add to the head.
			if ( data.player_api && ! $( 'script[src="'+ data.player_api +'"]', document.head ).length ) {
				$( 'head' ).append( '<script src="'+ data.player_api +'"></script>' );
			}

			// Add init and container.
			self.$videoH.html( data.player_html );

			self.$videoTag = self.getVideo();

			// Play <video>.
			if ( ! data.player_api && self.$videoTag ) {
				// Fixes video playback in Safari on mobile devices.
				if ( self.isWithOverlay && $ush.isSafari && /(iPhone|iPod|iPad)/i.test( navigator.platform ) ) {
					self.$videoTag.setAttribute( 'preload', 'metadata' );
				}
				self.$videoTag.play();
			}
		},

		/**
		 * Get video for play
		 */
		getVideo: function() {
			return this.$videoH.find( 'video' )[ 0 ] || false;
		}
	});

	$.fn.wVideo = function( options ) {
		return this.each( function() {
			$( this ).data( 'wVideo', new $us.wVideo( this, options ) );
		} );
	};

	$( () => {
		$( '.w-video' ).wVideo();
	} );

	// Init in Post\Product List or Grid context
	$us.$document.on( 'usPostList.itemsLoaded usGrid.itemsLoaded', ( _, $items ) => {
		$( '.w-video', $items ).wVideo();
	} );

} )( jQuery );
