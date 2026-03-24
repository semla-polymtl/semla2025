/**
 * Since WPBakery's customization options are limited, it implements
 * add-on functionality on side JS. This approach is not stable,
 * but there are no other solutions yet.
 */
! function( $, _undefined ) {
	"use strict";

	const _document = document;

	/**
	 * The handler is called every time the panel for adding elements is opened.
	 *
	 * Note: The implementation of this functionality is based on the inner workings
	 * of the script and has no public documentation or support.
	 *
	 * @deps /wp-content/plugins/js_composer/assets/js/dist/backend.min.js
	 */
	function showAddElementPanel() {
		const self = this;
		let model = self.model,
			iteration = 0;
		// Get all parents relative to current tag
		let parents = [];
		while( !! model && iteration++ < /* number of max iterations */1000 ) {
			const tag = model.get( 'shortcode' );
			if ( ( vc.getMapped( tag ) || {} ).is_container ) {
				parents.push( tag );
			}
			model = vc.shortcodes.get( model.get( 'parent_id' ) ); // next parent model
		}
		// Hide all containers of the same type since nesting in itself is prohibited
		$( '[data-vc-ui-element][data-is-container=true]', self.$el ).each( ( _, node ) => {
			const $node = $( node );
			let tag = $node.data( 'element' );
			// Check the nesting of elements `vc_tta_*`
			// if ( tag.indexOf( 'vc_tta_' ) > -1 && parents.join().indexOf( 'vc_tta_' ) > -1 ) {
			// 	$node.css( 'display', 'none' );
			// 	return;
			// }
			// Support for nesting of the second row through `vc_row_inner`
			if ( tag === 'vc_row' && parents.includes( tag ) ) {
				tag = 'vc_row_inner';
			}
			// Determine has same tag parent
			$node.css( 'display', parents.includes( tag ) ? 'none' : 'block' );
		} );
	}

	$( () => {
		// Check loaded Visual Composer
		if ( $ush.isUndefined( window.vc ) ) {
			return;
		}

		// After initialization, subscribe to WPBakery events.
		vc.events.on( 'app.render', () => {
			vc.add_element_block_view.on( 'show', showAddElementPanel );

			// Copied the functionality from the 'attach_image' field type to 'us_upload'
			// for displaying a preview image for admin. Note: Important field name must be 'image'
			if ( vc.atts[ 'attach_image' ] ) {
				vc.atts[ 'us_upload' ] = _.clone( vc.atts[ 'attach_image' ] );
			}

			let cancelSortable = false;

			// Undo dragging "vc_row_inner" to "vc_row_inner" for Visual Composer
			// https://api.jqueryui.com/sortable
			vc.app.$content
				.on( 'sortbeforestop', ( _, ui ) => {
					cancelSortable = (
						ui.item.data( 'element_type' ) === 'vc_row_inner'
						&& $ush.toArray( ui.placeholder.closest( '[data-element_type=vc_row_inner]' ) ).length
					);
				} )
				.on( 'sortstop', ( e ) => {
					if ( cancelSortable ) {
						e.preventDefault();
					}
				} );
		} );
	} );

	// Support for adding examples to the field for Visual Composer
	$( _document ).on( 'click', '.usof-example', ( e ) => {
		e.preventDefault();
		e.stopPropagation();

		var $target = $( e.target ).closest( 'span' );
		$( 'input[type="text"]', $target.closest( '.edit_form_line:not(.usof-not-live)' ) )
			.val( $target.html() )
			.trigger( 'change' );
	} );

}( jQuery );

/**
 * Paste Section for WPBakery Page Builder.
 */
! function( $, undefined ) {
	"use strict";

	/**
	 * @class US_VC_PasteSection - Class for import shortcodes into the WPBakery Page Builder.
	 */
	function US_VC_PasteSection() {
		const self = this;

		// Elements
		self.$window = $( '.us-paste-section-window:first' );
		self.$pasteButton = $( '.vc_ui-button-action', self.$window );
		self.$input = $( 'textarea', self.$window );
		self.$errMessage = $( '.vc_description', self.$window );

		// Private "Variables"
		self.data = $ush.toPlainObject( self.$window[0].onclick() );

		// Bondable events
		self._events = {
			showPopup: self.showPopup.bind( self ),
			hidePopup: self.hidePopup.bind( self ),
			insertShortcodeToContent: self.insertShortcodeToContent.bind( self ),
		};

		// Event
		$( _document )
			.on( 'click', '.vc_icon-btn.for_us_paste_section', self._events.showPopup )
			.on( 'click', '.vc_ui-button-action', self._events.insertShortcodeToContent )
			.on( 'click', '.us-paste-section-window:first .vc_ui-close-button', self._events.hidePopup );
	};

	// US_VC_PasteSection API
	US_VC_PasteSection.prototype = {

		/**
		 * Show popup to enter copied code.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		showPopup: function( e ) {
			const self = this;

			self._hideError();
			self.$window.show();
			self.$input[0].focus();

			// Prevent execution of WPBakery paste action while our Paste Row/Section window is open
			// Note: adding event to #wpwrap since WPBakery adding its event to body. This way we ensure our event fires first
			$( '#wpwrap' ).on( 'paste.upsolution', ( e ) => {
				if ( $( e.target ).closest( '#wpb_wpbakery, .vc_ui-panel-window' ).length ) {
					e.stopPropagation();
					e.preventDefault();
				}
			} );

			// WPBakery is checking if it should add its Paste action on each click,
			// so we trigger a click on our input to disable their Paste action
			self.$input.trigger( 'click' );

			e.stopPropagation();
			e.preventDefault();
		},

		/**
		 * Hide popup to enter copied code.
		 *
		 * @event handler
		 */
		hidePopup: function() {
			const self = this;
			self.$window.hide();
			self.$input.val( '' );
			if ( self.$pasteButton.hasClass( 'loading' ) ) {
				self.$input.prop( 'disabled', false );
				self.$pasteButton.removeClass( 'loading' );
			}

			// Remove our execution block for WPBakery Paste action (added in the showPopup function)
			$( '#wpwrap' ).off( 'paste.upsolution' );
		},

		/**
		 * Insert shortcode at the end of the post_content.
		 *
		 * @event handler
		 */
		insertShortcodeToContent: function() {
			const self = this;
			let value = $ush.toString( self.$input.val() ).trim();
			if ( ! self.isValueValid( value ) ) {
				return;
			}
			value = self.applyFilters( value );
			$.each( vc.storage.parseContent( {}, value ), ( _, model ) => {
				if ( model && model.hasOwnProperty( 'shortcode' ) ) {
					vc.shortcodes.create( model ); // insert content
					self.hidePopup();
				}
			} );
		},

		/**
		 * Apply filters to value.
		 *
		 * @return {String} Returns values after applying filters.
		 */
		applyFilters: function( value ) {
			const self = this;
			const placeholder = $ush.toString( self.data.placeholder );

			value = $ush.toString( value )
				// Search and replace use:placeholder
				.replace( /use:placeholder/g, placeholder )
				// Replace images for new design options
				.replace( /css="([^\"]+)"/g, ( matches, match ) => {
					if ( match ) {
						var jsoncss = $ush.toString( $ush.rawurldecode( match ) )
							.replace( /("background-image":")(.*?)(")/g, ( _, before, id, after ) => {
								if ( ! $ush.parseInt( id ) ) {
									id = placeholder;
								}
								return before + id + after;
							} );
						return 'css="' + $ush.rawurlencode( jsoncss ) + '"';
					}
					return matches;
				} )
				// Check the post_type parameter
				.replace( /\s?post_type="(.*?)"/g, ( match, post_type ) => {
					if ( self.data.grid_post_types.indexOf( post_type ) === - 1 ) {
						return ' post_type="post"'; // default
					}
					return match;
				} );

			// Remove [us_post_content..] if post_type is not us_content_template
			if ( self.data.post_type !== 'us_content_template' ) {
				value = value.replace( /(\[us_post_content.*?])/g, '' );
			}

			// Import grid layout
			value = value.replace( /(grid_layout_data="([^"]+)")/g, ( text ) => {
				const matches = text.match( /grid_layout_data="([^"]+)/i );
				return 'items_layout="' + self.importShortcodeData( $ush.toString( matches[1] ) ) + '"';
			} );

			return value;
		},

		/**
		 * Import Shortcode Data.
		 *
		 * @param {String} post_content The post content.
		 * @return {String} Returns imported content.
		 */
		importShortcodeData: function( post_content ) {
			const self = this;
			let output = '';
			self.$input.prop( 'disabled', true );
			self.$pasteButton.addClass( 'loading' );
			$.ajax( {
				type: 'POST',
				url: $usof.ajaxUrl,
				async: false,
				data: {
					_nonce: $ush.toString( self.$window.data( 'nonce' ) ),
					action: 'us_import_shortcode_data',
					post_type: 'us_grid_layout',
					post_content: post_content,
				},
				dataType: 'json',
				success: ( res ) => {
					if ( res.success || res.hasOwnProperty( 'data' ) ) {
						output = $ush.toString( res.data );
					}
				},
				error: console.error
			} );
			return output;
		},

		/**
		 * Check if the value is valid.
		 *
		 * @param {String} value The value to check.
		 * @return {Boolean} True if valid, False otherwise.
		 */
		isValueValid: function( value ) {
			const self = this;
			// Add notice if the text is empty
			if ( value === '' ) {
				self._showError( self.data.errors.empty );
				return false;
			}
			// Add a notification if the text does not contain the shortcode [vc_row ... [/vc_row]
			if ( !/\[vc_row([\s\S]*)\/vc_row\]/gim.test( value ) ) {
				self._showError( self.data.errors.not_valid );
				return false;
			}
			self._hideError();
			return true;
		},

		/**
		 * Show error message.
		 *
		 * @param {String} message Error text.
		 */
		_showError: function( message ) {
			this.$errMessage.text( message ).show();
		},

		/**
		 * Hide error message.
		 */
		_hideError: function() {
			this.$errMessage.text( '' ).hide();
		}
	};

	// Init US_VC_PasteSection
	$( () => { new US_VC_PasteSection } );

}( jQuery );
