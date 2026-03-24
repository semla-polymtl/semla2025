/**
 * Available spaces:
 *
 * _window.$usb - Basic object for mounting and initializing all extensions of the builder
 * _window.$usbcore - Auxiliary functions for the builder and his extensions
 * _window.$ush - US Helper Library
 *
 * Note: Double underscore `__funcname` is introduced for functions that are created through `$ush.debounce(...)`.
 */
! function( $, _undefined ) {

	const ENTER_KEY_CODE = 13;

	/**
	 * @type {{}} Private temp data
	 */
	let _$tmp = {
		deleteSectionId: 0,
		listIsLoaded: false,
		sectionContent: '',
	};

	/**
	 * @class Favorites - Save section to Favorites
	 * @param {String} container
	 */
	function Favorites( container ) {
		let self = this;

		/**
		 * @type {{}} Bondable events
		 */
		self._events = {
			changeSectionName: self._changeSectionName.bind( self ),
			clickTabFavorites: self._clickTabFavorites.bind( self ),
			deleteSection: self._deleteSection.bind( self ),
			reorderSections: $ush.debounce( self._reorderSections.bind( self ), 1),
			resetSearch: self._resetSearch.bind( self ),
			saveToFavorites: self._saveToFavorites.bind( self ),
			saveToFavoritesByPressEnter: self._saveToFavoritesByPressEnter.bind( self ),
			search: self._search.bind( self ),
			setExampleValueToSectionName: self._setExampleValueToSectionName.bind( self ),
			showConfirmDelete: self._showConfirmDelete.bind( self ),
			showList: self.showList.bind( self ),
			showPopupToGetName: self._showPopupToGetName.bind( self ),
		};

		$( function() {
			// Elements
			self.$container = $( container );
				self.$search = $( '.usb-panel-search', container );
				self.$searchField = $( 'input[name=search]', container );
				self.$searchNoResult = $( '.usb-panel-search-noresult', container );
			self.$list = $( '.usb-favorites-list', container );
			self.$emptyList = $( '.usb-favorites-empty-list', container );
			self.$confirmDeletion = $( '.usb-favorites-confirm-deletion', container );

			// Events
			self.$container
				// Search sections by name
				.on( 'input', 'input[name=search]', $ush.debounce( self._events.search, 1 ) )
				// Reset search
				.on( 'click', '.usb_action_reset_search_in_panel', self._events.resetSearch )
				// Show block to confirm action before delete
				.on( 'click', '.usb_action_show_confirm_delete', self._events.showConfirmDelete )
				// Delete section from favorites
				.on( 'click', '.usb_action_delete_from_favorites', self._events.deleteSection )
				// Cancel delete section from favorites
				.on( 'click', '.usb_action_cancel_deletion_from_favorites', self._events.showList );
			$usb.$panel
				// Show and loading favorites
				.on( 'click', '.usb_action_show_favorites', self._events.clickTabFavorites );

			// Sorting sections via Drag & Drop
			let dragDrop = new $usof.dragDrop( self.$list, '.usb-favorites-item', /* checkDraggable */true );
			dragDrop.on( 'changed', self._events.reorderSections );

			// Popup for get section name
			self.popup = new $usof.popup( 'popup_save_to_favorites', {
				closeOnEsc: true,
				closeOnBgClick: true,
				init: function() {
					let $popup = this.$container;
					self.$inputSectionName = $( 'input[name=section_name]', $popup );
					self.$saveButton = $( '.usb_action_save_to_favorites', $popup );
					self.$errMessage = $( '.usof-message.status_error', $popup );
					$( $popup )
						.on( 'input', 'input[name=section_name]', self._events.changeSectionName )
						.on( 'keyup', 'input[name=section_name]', $ush.debounce( self._events.saveToFavoritesByPressEnter, 1 ) )
						.on( 'click', '.usb_action_save_to_favorites', self._events.saveToFavorites )
						.on( 'click', '.usof-example', self._events.setExampleValueToSectionName );
				},
				afterShow: function() {
					$ush.timeout( function() {
						self.$inputSectionName[0].focus();
					}, 20 );
				},
				afterHide: function() {
					self.$inputSectionName
						.removeClass( 'is_invalid' )
						.val( '' );
					_$tmp.sectionContent = '';
				}
			} );
		} );

		// Private events
		$usb.on( 'favorites.saveToFavorites', self._events.showPopupToGetName );
	}

	// Favorite Sections API
	$.extend( Favorites.prototype, $ush.mixinEvents, {

		/**
		 * Determines if ready.
		 *
		 * @return {Boolean} True if ready, False otherwise.
		 */
		isReady: function() {
			return ! $ush.isUndefined( this.$container );
		},

		/**
		 * Determines if show.
		 *
		 * @return {Boolean} True if show, False otherwise.
		 */
		isShow: function() {
			return this.$container.is( ':visible' );
		},

		/**
		 * Determines whether the specified id is favorite section.
		 *
		 * @param @param {String} id Shortcode's usbid, e.g. "favorite_section:1"
		 * @return {Boolean} True if the specified id is favorite section, False otherwise.
		 */
		isFavoriteSection: function( id ) {
			if ( $usb.builder.isValidId( id ) ) {
				id = $usb.builder.getElmType( id );
			}
			return id === 'favorite_section';
		},

		/**
		 * Gets the list on first open.
		 */
		_clickTabFavorites: function() {
			let self = this;
			if ( _$tmp.listIsLoaded || ! $usb.licenseIsRealActivated() ) {
				self.showList();
				return;
			}
			$usb.panel.showPreloader();
			$usb.ajax( 'favorites.clickTabFavorites', {
				data: {
					_nonce: $usb.config( '_nonce' ),
					action: $usb.config( 'action_get_favorites' ),
				} ,
				success: function( res ) {
					if ( res.success && res.data ) {
						self.$list.html( res.data );
					}
				},
				complete: function() {
					$usb.panel.hidePreloader();
					$ush.timeout( self.showList.bind( self ), 1 );
					_$tmp.listIsLoaded = true;
				},
			} );
		},

		/**
		 * Search sections by name.
		 *
		 * @event handler
		 */
		_search: function() {
			let self = this,
				$input = self.$searchField,
				isFoundResult = true,
				value = $ush.toLowerCase( $input[0].value ).trim(),
				$items = $( '.usb-favorites-item', self.$list );
			if ( ! $items.length ) {
				return;
			}
			$input
				.next( '.usb_action_reset_search_in_panel' )
				.toggleClass( 'hidden', ! value );
			if ( value ) {
				$items.addClass( 'hidden' );
				isFoundResult = !! $items
					.filter( '[data-search-text^="' + value + '"], [data-search-text*="' + value + '"]' )
					.removeClass( 'hidden' )
					.length;
			} else {
				$items.removeClass( 'hidden' );
			}
			self.$searchNoResult.toggleClass( 'hidden', isFoundResult );
		},

		/**
		 * Reset search.
		 *
		 * @event handler
		 */
		_resetSearch: function() {
			let $input = this.$searchField;
			if ( $input.val() ) {
				$input.val( '' ).trigger( 'input' );
			}
		},

		/**
		 * Shows the list.
		 *
		 * @event handler [optional]
		 */
		showList: function() {
			let self = this,
				listIsEmpty = self.$list.is( ':empty' );
			self.$confirmDeletion.addClass( 'hidden' );
			self.$list.toggleClass( 'hidden', listIsEmpty );
			self.$emptyList.toggleClass( 'hidden', ! listIsEmpty );
			self.$search.toggleClass( 'hidden', listIsEmpty );
			self.$container.toggleClass( 'is_empty_list', listIsEmpty );

			// Set focus to search field (Focus does not work when the developer console is open!)
			if ( ! listIsEmpty ) {
				$ush.timeout( function() {
					self.$searchField[0].focus();
				}, 10 );
			}
		},

		/**
		 * Shows the confirm delete.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_showConfirmDelete: function( e ) {
			let self = this,
				$target = $( e.target ).closest( '.usb-favorites-item' ),
				name = $( '.usb-favorites-item-title:first', $target ).text();
			self.$search.addClass( 'hidden' );
			self.$emptyList.addClass( 'hidden' );
			self.$list.addClass( 'hidden' );
			self.$confirmDeletion
				.removeClass( 'hidden' )
				.find( '.for_section_name' )
				.text( name );
			_$tmp.deleteSectionId = $target.data( 'section-id' );
		},

		/**
		 * Show popup to get section name,
		 *
		 * @event handler
		 * @param {String} id Shortcode's usbid, e.g. "vc_row:1".
		 */
		_showPopupToGetName: function( id ) {
			let self = this;
			if (
				! self.isReady()
				|| ! $usb.builder.isValidId( id )
				|| ! self.popup
			) {
				return;
			}
			_$tmp.sectionContent = $usb.builder.getElmShortcode( id );

			self.$errMessage.addClass( 'hidden' );
			self.popup.show();
		},

		/**
		 * Changes in field section name.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_changeSectionName: function( e ) {
			let $target = $( e.currentTarget );
			$target.toggleClass( 'is_invalid', ! $target.val() );
		},

		/**
		 * Sets the values from the example.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_setExampleValueToSectionName: function( e ) {
			$usbcore.setTextToCaretPosition( this.$inputSectionName[0], e.currentTarget.innerHTML );
		},

		/**
		 * Saves section to favorites.
		 *
		 * @event handler
		 */
		_saveToFavorites: function() {
			let self = this,
				sectionName = self.$inputSectionName.val();
			if ( ! sectionName.trim() ) {
				self.$inputSectionName.addClass( 'is_invalid' );
				return;
			}
			self.$saveButton.addClass( 'loading' );
			self.$errMessage.addClass( 'hidden' );
			$usb.ajax( 'favorites.saveToFavorites', {
				data: {
					_nonce: $usb.config( '_nonce' ),
					action: $usb.config( 'action_save_to_favorites' ),
					section_name: sectionName,
					section_content: _$tmp.sectionContent,
				} ,
				success: function( res ) {
					if ( ! res.success ) {
						self.$errMessage
							.text( res.data.message )
							.removeClass( 'hidden' );
						return;
					}
					_$tmp.sectionContent = '';

					if ( res.data ) {
						self.$list.prepend( res.data );
						self.showList();
					}
					self.popup.hide();
					self.$inputSectionName.val( '' );
				},
				complete: function() {
					self.$saveButton.removeClass( 'loading' );
				},
			} );
		},

		/**
		 * Saves section to favorites by pressing Enter.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_saveToFavoritesByPressEnter: function( e ) {
			if ( e.keyCode === ENTER_KEY_CODE ) {
				this._saveToFavorites();
			}
		},

		/**
		 * Delete section from favorites.
		 *
		 * @event handler
		 */
		_deleteSection: function() {
			let self = this;
			$usb.panel.showPreloader();
			$usb.ajax( 'favorites.deleteSection', {
				data: {
					_nonce: $usb.config( '_nonce' ),
					action: $usb.config( 'action_delete_from_favorites' ),
					section_id: _$tmp.deleteSectionId,
				} ,
				success: function( res ) {
					if ( res.success ) {
						$( '[data-section-id="' + _$tmp.deleteSectionId + '"]', self.$list ).remove();
					}
				},
				complete: function() {
					$usb.panel.hidePreloader();
					$ush.timeout( self.showList.bind( self ), 1 );
				},
			} );
		},

		/**
		 * Reorder of sections.
		 *
		 * @event handler
		 */
		_reorderSections: function() {
			let self = this,
				orderedIDs = [];
			$( '> *', self.$list ).each( function( _, node ) {
				orderedIDs.push( $usbcore.$attr( node, 'data-section-id' ) );
			} );
			$usb.panel.showPreloader();
			$usb.ajax( 'favorites.reorderSections', {
				data: {
					_nonce: $usb.config( '_nonce' ),
					action: $usb.config( 'action_reorder_favorite_sections' ),
					ordered_ids: orderedIDs,
				},
				complete: function() {
					$usb.panel.hidePreloader();
				},
			} );
		},

		/**
		 * Insert section in content and preview.
		 *
		 * @param {String} sectionId The favorite section id.
		 * @param {String} parentId ID of the element's parent element.
		 * @param {Number} currentIndex Position of the element inside the parent.
		 */
		insertSection: function( sectionId, parentId, currentIndex ) {
			let self = this;

			// Get the insert position
			var insert = $usb.builder.getInsertPosition( parentId, currentIndex );

			// Get html shortcode code and set on preview page
			$usb.postMessage( 'showPreloader', [
				insert.parent,
				insert.position,
			] );

			$usb.builder.renderShortcode( 'favorites.insertSection', {
				data: {
					section_id: sectionId,
					isReturnContent: true // returns the content for the page (shortcodes)
				},
				success: function( res ) {
					$usb.postMessage( 'hidePreloader', insert.parent );

					// Check the correctness of the answer and the availability of data
					if ( ! res.success || ! res.data.content || ! res.data.html ) {
						return;
					}

					// Update IDs in content
					let newData = $usb.builder.updateIdsInContent( res.data.content, res.data.html );

					// Adds shortcode to content
					if ( ! $usb.builder._addShortcodeToContent( parentId, currentIndex, newData.content ) ) {
						return false;
					}

					// Adds new section to preview page
					$usb.postMessage( 'insertElm', [ insert.parent, insert.position, newData.html ] );

					// Commit to save changes to history
					if ( $usb.builder.isRow( newData.firstElmId ) ) {
						$usb.history.commitChange( newData.firstElmId, _CHANGED_ACTION_.CREATE );
					}

					$usb.trigger( 'builder.contentChange' ); // event for react in extensions
				}
			} );
		},
	} );

	// Export API
	$usb.favorites = new Favorites( '#usb-favorites' );

} ( jQuery );
