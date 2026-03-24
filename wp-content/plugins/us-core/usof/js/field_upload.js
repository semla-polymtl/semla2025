/**
 * USOF Field: Upload
 */
! function( $, undefined ) {
	// Private variables that are used only in the context of this function, it is necessary to optimize the code.
	var _window = window,
		_document = document;

	// Math API
	var abs = Math.abs;

	if ( $ush.isUndefined( _window.$usof ) ) {
		return;
	}

	/**
	 * @type {{}} Types of previews displayed.
	 */
	const _PREVIEW_TYPE_ = {
		DYNAMIC_VALUE: 'dynamic_value',
		IMAGE: 'image',
		TEXT: 'text',
	};

	$usof.field[ 'upload' ] = {

		init: function( options ) {
			var self = this;

			self.parentInit( options );

			// Elements
			self.$container = $( '.usof-upload', self.$row );
			self.$preview = $( '.usof-upload-preview', self.$row );

			// Variables
			self._dynamicLabels = {};
			self.hasDynamicValues = $( '.usof-popup', self.$row ).length;
			self.i18n = {};
			self.isMultiple = self.$container.hasClass( 'is_multiple' );
			self.placeholder = $( 'input[name="placeholder"]', self.$row ).val();
			self.popup = {};

			// Get preview type by default
			self._previewType = self.$container.data( 'preview-type' );
			self.$container.removeAttr( 'data-preview-type' );

			// Load internationalization
			var $i18n = $( '.usof-upload-i18n', self.$row );
			if ( $i18n.length ) {
				self.i18n = $i18n[ 0 ].onclick() || {};
				$i18n.remove();
			}

			/**
			 * @var {{}} Bondable events
			 */
			self._events = {
				removeItem: self._removeItem.bind( self ),
				selectedInMediaLibrary: self._selectedInMediaLibrary.bind( self ),
				showMediaLibrary: self._showMediaLibrary.bind( self ),
				showSelectedInMediaLibrary: self._showSelectedInMediaLibrary.bind( self ),
				showSelectionWindow: self._showSelectionWindow.bind( self ),
			};

			// Events
			self.$row
				// Remove item from selected.
				.on( 'click', '.ui-icon_close', self._events.removeItem )
				// Opens a media uploader.
				.on( 'click', '.ui-icon_add', self._events.showMediaLibrary );

			// Show selection window depending on preview type.
			if ( ! self.isMultiple ) {
				self.$row.on( 'click', '.usof-upload-preview-file', self._events.showSelectionWindow );
			}

			// Init Drag & Drop
			if ( self.isMultiple && self.getPreviewType() === _PREVIEW_TYPE_.IMAGE ) {
				self.$body = $( _document.body );
				self.$window = $( _window );
				self.$dragShadow = $( '<div class="usof-dragshadow"></div>' );

				$.extend( self._events, {
					dragEnd: self._dragEnd.bind( self ),
					dragMove: self._dragMove.bind( self ),
					dragStart: self._dragStart.bind( self ),
					maybeDragMove: self._maybeDragMove.bind( self ),
				} );

				self.$row
					.on( 'mousedown', '.usof-upload-preview-file', self._events.dragStart )
					// Preventing browser native drag event.
					.on( 'dragstart', function( e ) { e.preventDefault() } );
			}

			// If there are dynamic values, then there must be a popup window
			if ( self.hasDynamicValues ) {
				self.$variables = $( '.usof-upload-variables', self.$row );
				self.$dynamicValue = $( '.usof-upload-dynamic-value', self.$row );

				self._events.selectDynamicValue = self._selectDynamicValue.bind( self );

				// Events
				self.$preview
					.on( 'click', '.usof-upload-preview-file', function( e ) {
						if ( self.getPreviewType() === _PREVIEW_TYPE_.DYNAMIC_VALUE ) {
							self._showSelectionWindow( e );
						}
					} );

				// Set a unique popup id (this is necessary for groups like Dropdown)
				self.popupId = $ush.uniqid();
				$( '[data-popup-id]', self.$row ).attr( 'data-popup-id', self.popupId );
				$( '[data-popup-show]', self.$row ).attr( 'data-popup-show', self.popupId );

				// Create a new popup
				self.popup = new $usof.popup( self.popupId, {
					closeOnEsc: true, // close the popup by pressing Escape
					closeOnBgClick: true, // close the popup when user clicks on the dark overlay
					// Fires after first initialization
					init: function() {
						/*popup*/this.$container
							.off( 'click' )
							.on( 'click', '[data-dynamic-value]', self._events.selectDynamicValue )
							.find( '[data-dynamic-value]' )
							.each( function( _, node ) {
								var $node = $( node );
								if ( $node.data( 'dynamic-label' ) ) {
									self._dynamicLabels[ $node.data( 'dynamic-value' ) ] = $node.data( 'dynamic-label' );
									$node.removeAttr( 'data-dynamic-label' );
								}
							} );
					},
					// Handler is called before the popup show
					beforeShow: function() {
						var that = this;
						// Set or remove active class
						$( '[data-dynamic-value]', that.$container ).removeClass( 'active' );
						$ush.toString( self.getValue() )
							.split( ',' )
							.map( function( value ) {
								$( '[data-dynamic-value="'+ value +'"]', that.$container ).addClass( 'active' );
							} );
					}
				} );

				// Check the initialization of the popup
				if ( $.isEmptyObject( self.popup ) ) {
					console.error( 'Failed to initialize popup' );
				}
			}
		},

		/**
		 * Determine whether any of the matched elements are assigned the given class.
		 * Note:Specific method for fixing a bug.
		 *
		 * @param {Node} node The node from document.
		 * @param {String} className The class name one or more separated by a space.
		 * @return {Boolean} True, if there is at least one class, False otherwise.
		 */
		_hasClass: function( node, className ) {
			return $ush.isNode( node ) && ( ' ' + node.className + ' ' ).indexOf( ' ' + className + ' ' ) > - 1;
		},

		/**
		 * Get current preview type.
		 *
		 * @return {String} Returns the current preview type.
		 */
		getPreviewType: function() {
			return this.$container.usMod( 'preview' );
		},

		/**
		 * Set the preview type.
		 *
		 * @param {String} type The new type.
		 */
		setPreviewType: function( type ) {
			this.$container.usMod( 'preview', $ush.toString( type ) );
		},

		/**
		 * Show selection window depending on preview type.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_showSelectionWindow: function( e ) {
			var self = this;
			// If these are deletions, then we exit
			if ( self._hasClass( e.target, 'ui-icon_close' ) ) {
				return;
			}
			if ( self.getPreviewType() === _PREVIEW_TYPE_.DYNAMIC_VALUE ) {
				$( 'button.for_select_dynamic_value', self.$row ).trigger( 'click' );
			} else {
				self._showMediaLibrary( e );
			}
		},

		/**
		 * Show Media Library.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_showMediaLibrary: function( e ) {
			var self = this,
				mediaInstance = self.mediaInstance;
			// If these are deletions, then we exit
			if ( self._hasClass( e.target, 'ui-icon_close' ) ) {
				return;
			}
			if ( $ush.isUndefined( mediaInstance ) ) {
				var mediaSettings = {
					multiple: self.isMultiple ? 'add' : false,
				};
				if ( self.getPreviewType() === _PREVIEW_TYPE_.IMAGE ) {
					mediaSettings.library = { type: 'image' };
				}
				mediaInstance = wp.media( mediaSettings );
				mediaInstance.on( 'open', self._events.showSelectedInMediaLibrary );
				mediaInstance.on( 'select', self._events.selectedInMediaLibrary );
				self.mediaInstance = mediaInstance;
			}
			mediaInstance.open();
		},

		/**
		 * Handler for show selected attachments in Media Library.
		 *
		 * @event handler
		 */
		_showSelectedInMediaLibrary: function() {
			var self = this,
				mediaInstance = self.mediaInstance;
			mediaInstance.state().get( 'selection' ).reset();
			$ush.toString( self.getValue() )
				.split( ',' )
				.map( function( attachmentId, i ) {
					if ( ! self.isMultiple && i > 0 ) {
						return;
					}
					mediaInstance.state().get( 'selection' ).add( wp.media.attachment( $ush.parseInt( attachmentId ) ) );
				} );
		},

		/**
		 * Handler for set selected attachments from Media Library.
		 *
		 * @event handler
		 */
		_selectedInMediaLibrary: function() {
			var self = this,
				mediaInstance = self.mediaInstance,
				value = [];
			if ( self.isMultiple ) {
				mediaInstance.state().get( 'selection' ).each( function( attachment ) {
					if ( attachment.attributes.url ) {
						value.push( attachment.id );
					}
				} );
			} else {
				var attachment = mediaInstance.state().get( 'selection' ).first();
				if ( attachment.attributes.url ) {
					value = [ attachment.id ];
				}
			}
			// For WPBakery image filters
			if ( _window.vc_selectedFilters && _window.vcAdminNonce ) {
				$.ajax( {
					type: 'POST',
					url: $usof.ajaxUrl,
					dataType: 'json',
					data: {
						action: 'vc_media_editor_add_image',
						filters: _window.vc_selectedFilters,
						ids: value,
						_vc_inline: true,
						_vcnonce: _window.vcAdminNonce
					},
					success: ( res ) => {
						if ( res.data.ids.length ) {
							self.setValue( res.data.ids.toString() );
						}
					},
					complete: () => {
						_window.vc_selectedFilters = _undefined;
					},
				} );
			} else {
				self.setValue( value.toString() );
			}
		},

		/**
		 * Remove item from selected.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_removeItem: function( e ) {
			var self = this;
				$previewFile = $( e.target ).closest( '.usof-upload-preview-file' ),
				removeValue = $ush.toString( $previewFile.data( 'value' ) );
			if ( removeValue ) {
				var value = $ush.parseInt( removeValue ) !== -1 // -1 installed on demos for placeholder
					? $ush.toString( self.getValue() )
					: '';
				if ( value ) {
					value = value
						.split( ',' )
						.filter( function( value ) { return value !== removeValue  } )
						.toString();
				}
				if ( value ) {
					self.parentSetValue( value );
				} else {
					self.setValue( '' );
				}
				$previewFile.remove();
			}
		},

		/**
		 * Handler for select a dynamic value in a popup.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_selectDynamicValue: function( e ) {
			e.preventDefault();
			var self = this;

			// Update preview type and set value
			self.setPreviewType( _PREVIEW_TYPE_.DYNAMIC_VALUE );
			self.setValue( $ush.toString( e.target.dataset['dynamicValue'] ) );

			// Hide a popup by its id
			if ( self.popupId ) {
				$usof.hidePopup( $ush.toString( self.popupId ) );
			}
		},

		/**
		 * Render preview.
		 *
		 * @param {String|undefined} THe URL address or plain text.
		 * @param {String} value The id or dynamic value.
		 * @param {Boolean} removeButton Presence of a remove button.
		 * @param {Numeric} index Preview index in the list if any.
		 */
		renderPreview: function( text, value, removeButton, index ) {
			var self = this,
				previewType = self.getPreviewType(),
				newPreview = '';
			text = $ush.toString( text );
			if ( ! text ) {
				return
			}
			// Create new preview
			if ( previewType === _PREVIEW_TYPE_.DYNAMIC_VALUE ) {
				newPreview = '<span>' + $ush.toString( self._dynamicLabels[ value ] ) + '</span>';

			} else if ( previewType === _PREVIEW_TYPE_.IMAGE ) {
				if ( text !== ':placeholder' ) {
					newPreview = '<img src="' + text + '" alt="">';
				}

			} else {
				if ( text === ':placeholder' ) {
					text = '...';
				}
				newPreview = '<span>' + text.substring( text.lastIndexOf( '/' ) + 1 ) + '</span>';
			}
			if ( removeButton ) {
				newPreview += '<div class="ui-icon_close" title="' + self.i18n.delete + '">';
			}
			newPreview = '<div class="usof-upload-preview-file" data-value="' + $ush.toString( value ) + '">' + newPreview + '</div>';
			// Remove duplicates (placeholders)
			$( '[data-value="'+ value +'"]', self.$preview ).remove();
			// Add the file to the desired position, because adding is asynchronous.
			var previews = $( '> *', self.$preview ).toArray();
			previews.splice( $ush.parseInt( index ), 0, newPreview );
			self.$preview.append( previews );
			self.$preview.toggleClass( 'hidden', ! previews.length );
		},

		/**
		 * Set the value.
		 *
		 * @param {String} value The value.
		 * @param {Boolean} quiet The quiet mode.
		 */
		setValue: function( value, quiet ) {
			var self = this;
			// Set value
			value = $ush.toString( value );
			self.parentSetValue( value, quiet );
			if ( ! quiet ) {
				self.trigger( 'change', [ value ] );
			}
			// Clear preview
			self.$preview.addClass( 'hidden' ).html( '' );
			// Set placeholder or clear preview
			if ( value === '' ) {
				// Set default preview type
				self.setPreviewType( self._previewType );
				if ( self.placeholder ) {
					self.renderPreview( self.placeholder );
				}
				return;
			}
			if ( value.indexOf( '{{' ) > -1 ) {
				self.setPreviewType( _PREVIEW_TYPE_.DYNAMIC_VALUE );
			}
			/**
			 * @param {{}} attachment The attachment object.
			 */
			function addAttachment( attachment, index ) {
				var url = attachment.attributes.url;
				if ( ! $ush.isUndefined( attachment.attributes.sizes ) ) {
					var size = self.isMultiple ? 'thumbnail' : 'medium';
					if ( $ush.isUndefined( attachment.attributes.sizes[ size ] ) ) {
						size = 'full';
					}
					url = attachment.attributes.sizes[ size ].url;
				}
				self.renderPreview( url, attachment.id, /* removeButton */true, index );
			}

			if ( self.isDynamicVariable( value ) ) {
				self.renderPreview( value, /* dynamic-value */value, /* removeButton */true );

			} else if ( /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test( value ) ) {
				self.renderPreview( value, /* attachmentId */-1, /* removeButton */true );

			} else {
				var queryArgs = {
					// gets an array of positive values, without zero
					include: value.split( ',' ).map( $ush.parseInt ).filter( $ush.parseInt ),
					posts_per_page: -1,
				};
				// Set placeholders
				queryArgs.include.map( function( attachmentId, index ) {
					self.renderPreview( ':placeholder', attachmentId, /* removeButton */false, index );
				} );
				// Get all attachments in one request
				wp.media.query( queryArgs ).more().then( function () {
					queryArgs.include.map( function( value, index ) {
						var attachment = wp.media.attachment( $ush.parseInt( value ) );
						if ( ! $ush.isUndefined( attachment.attributes.url ) ) {
							addAttachment( attachment, index );
						} else {
							// Loading missing data via ajax
							attachment.fetch( { success: addAttachment.bind( null, attachment, index ) } );
						}
					} );
				} );
			}
		}
	};

	// Drag & Drop functionality
	$.extend( $usof.field[ 'upload' ], {

		/**
		 * Determines whether the specified e is in blind spot.
		 *
		 * @param @param {Event} e The Event interface represents an event which takes place in the DOM.
		 * @return {Boolean} True if the specified e is in blind spot, False otherwise.
		 */
		_isInBlindSpot: function( e ) {
			return (
				abs( e.pageX - this.blindSpot[0] ) <= 20
				&& abs( e.pageY - this.blindSpot[1] ) <= 20
			);
		},

		/**
		 * Handler when the user starts dragging a node.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_dragStart: function( e ) {
			var self = this;
			// Prevent drag event start when clicked on delete icon inside image element
			if ( self._hasClass( e.target, 'ui-icon_close' ) ) {
				return;
			}
			e.stopPropagation();
			self.$draggedElm = $( e.target ).closest( '.usof-upload-preview-file' );
			self.detached = false;
			self.blindSpot = [ e.pageX, e.pageY ].map( $ush.parseInt );
			self.elmPointerOffset = [ e.pageX, e.pageY ].map( $ush.parseInt );
			self.$body.on( 'mousemove', self._events.maybeDragMove );
			self.$window.on( 'mouseup', self._events.dragEnd );
		},

		/**
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_maybeDragMove: function( e ) {
			var self = this;
			e.stopPropagation();
			if ( self._isInBlindSpot( e ) ) {
				return;
			}
			self.$body.off( 'mousemove', self._events.maybeDragMove );
			self._detach();
			self.$body.on( 'mousemove', self._events.dragMove );
		},

		/**
		 * Handler for detaching drag.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_detach: function( e ) {
			var self = this,
				$draggedElm = self.$draggedElm,
				offset = $draggedElm.offset();
			self.elmPointerOffset[0] -= offset.left;
			self.elmPointerOffset[1] -= offset.top;
			self.$dragShadow.css( {
				width: $draggedElm.outerWidth(),
				height: $draggedElm.outerHeight()
			} ).insertBefore( $draggedElm );
			$draggedElm.css( {
				position: 'absolute',
				'pointer-events': 'none',
				zIndex: 10000,
				width: $draggedElm.width(),
				height: $draggedElm.height()
			} ).css( offset ).appendTo( self.$body );
			self.detached = true;
		},

		/**
		 * Handler for drag operation completion.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_dragMove: function( e ) {
			var self = this;
			e.stopPropagation();
			self.$draggedElm.css( {
				left: e.pageX - self.elmPointerOffset[0],
				top: e.pageY - self.elmPointerOffset[1]
			} );
			if ( self._isInBlindSpot( e ) ) {
				return;
			}
			var node = e.target;
			// Checking two levels up
			for ( var level = 0; level <= 2; level ++, node = node.parentNode ) {
				if ( self._hasClass( node, 'usof-dragshadow' ) ) {
					return;
				}
				if ( self._hasClass( node, 'usof-upload-preview-file' ) ) {
					// Dropping element before or after sortables based on their relative position in DOM
					var nextNode = node.previousSibling,
						shadowAtLeft = false;
					while ( nextNode ) {
						if ( nextNode == this.$dragShadow[ 0 ] ) {
							shadowAtLeft = true;
							break;
						}
						nextNode = nextNode.previousSibling;
					}
					self.$dragShadow[ shadowAtLeft ? 'insertAfter' : 'insertBefore' ]( node );
					self.blindSpot = [ e.pageX, e.pageY ].map( $ush.parseInt ); // dragDrop
					break;
				}
			}
		},

		/**
		 * Handler to complete the drag & drop operation.
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM.
		 */
		_dragEnd: function( e ) {
			var self = this;
			self.$window.off( 'mouseup', self._events.dragEnd );
			self.$body
				.off( 'mousemove', self._events.maybeDragMove )
				.off( 'mousemove', self._events.dragMove );
			if ( ! self.detached ) {
				return;
			}
			self.$draggedElm.removeAttr( 'style' ).insertBefore( self.$dragShadow );
			self.$dragShadow.detach();
			// Saving the new element position
			var values = [];
			$( '.usof-upload-preview-file', self.$preview ).each( function( _, node ) {
				var value = $ush.toString( node.dataset['value'] );
				if ( value ) {
					values.push( value );
				}
			} );
			if ( values.length ) {
				self.parentSetValue( values.toString() );
			} else {
				self.setValue( '' )
			}
		}
	} );

}( jQuery );
