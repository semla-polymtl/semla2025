/**
 * Available spaces:
 *
 * _window.$usb - Basic object for mounting and initializing all extensions of the builder
 * _window.$usbcore - Auxiliary functions for the builder and his extensions
 * _window.$usof - UpSolution CSS Framework
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
	 * @type {{}} Private temp data
	 */
	var _$tmp = {
		fieldsets: {}, // fieldset for settings group
		isProcessSave: false, // the AJAX process of save data on the backend
		savedLiveOptions: {}, // save the last saved "Site Settings"
	};

	/**
	 * @class Site Settings - Site settings functionality (Theme Settings)
	 */
	function SiteSettings( container ) {
		var self = this;

		/**
		 * @type {String} Selected setting group id
		 */
		self.selectedGroupId;

		/**
		 * @type {USOF Fieldset} Active fieldset object
		 */
		self.activeFieldset;

		/**
		 * @type {Node} Active fieldset node
		 */
		self.$activeFieldset;

		// If you reload or leave the page, clear cookie data for preview
		if ( $usb.urlManager.hasParam( 'action', $usb.config( 'actions.site_settings' ) ) ) {
			_window.onbeforeunload = function( e ) {
				$usb.postMessage( 'clearCookies' );
			};
		}

		/**
		 * @type {{}} Bondable events
		 * @param {String} container The container
		 */
		self._events = {
			changeField: self._changeField.bind( self ),
			clickGoToBack: self._clickGoToBack.bind( self ),
			clickGroupId: self._clickGroupId.bind( self ),
			confirmExit: self._confirmExit.bind( self ),
			handlerClearBody: self._handlerClearBody.bind( self ),
			iframeReady: self._iframeReady.bind( self ),
			saveChanges: self._saveChanges.bind( self ),
			urlManager: self._urlManager.bind( self ),
		};

		$( function() {

			// Elements
			self.$container = $( container );
			self.$menu = $( '.usb-panel-site-settings-menu', $usb.$panel );

			// Actions
			self.$actionGoToBack = $( '.usb_action_go_to_back', $usb.$panel );

			// Load fieldsets
			var $fieldsets = $( '#usb-site-settings-fieldsets', self.$container );
			if ( $fieldsets.is( '[onclick]' ) ) {
				_$tmp.fieldsets = $fieldsets[0].onclick() || {};
				$fieldsets.remove();
			}

			// Events
			$usb.$panel
				// Handler for show settings
				.on( 'click', '[data-group-id]', self._events.clickGroupId )
				// Handler for back to the general menu
				.on( 'click', '.usb_action_go_to_back', self._events.clickGoToBack )
				// Handler for confirm exit without save changes
				.on( 'click', 'a:not([target=_blank])', self._events.confirmExit );

			// Run URL manager after ready
			self._urlManager( $usb.urlManager.getDataOfChange() );
		});

		// Private events
		$usb
			.on( 'iframeReady', self._events.iframeReady )
			.on( 'panel.clearBody', self._events.handlerClearBody ) // handler for clear the panel body
			.on( 'panel.saveChanges', self._events.saveChanges ) // save changes to the backend
			.on( 'hotkeys.ctrl+s', self._events.saveChanges ) // save changes by `(command|ctrl)+s`
			.on( 'urlManager.changed', self._events.urlManager ); // URL history stack change handler
	}

	/**
	 * @type {Prototype}
	 */
	var prototype = SiteSettings.prototype;

	// Private events
	$.extend( prototype, {
		/**
		 * Handler of change or move event on the history stack
		 *
		 * @event handler
		 * @param {{}|undefined} state Data object associated with history and current loaction
		 */
		_urlManager: function( state ) {
			var self = this,
				_siteSettings = $usb.config( 'actions.site_settings' );
			// If the document is not read, exit
			if ( ! self.isReady() ) {
				return;
			}
			// Show "Site Settings"
			if ( state.setParams.action === _siteSettings ) {
				// Initialize settings group by id
				var groupId = state.setParams.group;
				if ( groupId && self.selectedGroupId !== groupId ) {
					// Initialize after a iframe is read
					if ( ! $usb.iframeIsReady ) {
						// Show preloader in panel until preview and data from iframe are loader
						$usb.panel.showPreloader();
						$usb.one( 'iframeReady', self.initFieldset.bind( self, groupId ) );
					} else {
						self.initFieldset( groupId );
					}
				}
				else if ( ! groupId ) {
					self.showGeneralMenu(); // show general menu
				}

				// Control of the "Go Back" button
				self.$actionGoToBack
					.toggleClass( 'disabled', ! state.setParams.group );
			}
			// Hide "Settings Menu"
			else if ( state.oldParams.action === _siteSettings ) {
				self._handlerClearBody(); // clear panel body
				_$tmp.savedLiveOptions = {}; // remove saved data

				// Remove related params
				$usb.urlManager.removeParam( 'group' ).push();
			}
		},

		/**
		 * Shows the browser confirmation before exit (e.g. clicking on links without target="_blank")
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_confirmExit: function( e ) {
			var message = $usb.getTextTranslation( 'page_leave_warning' );
			if ( this.isChanged() && ! confirm( message ) ) {
				e.preventDefault();
				return;
			}
		},

		/**
		 * Iframe ready event handler
		 *
		 * @event handler
		 */
		_iframeReady: function() {
			var self = this;
			if (
				! $usb.iframeIsReady
				|| ! $usb.urlManager.hasParam( 'action', $usb.config( 'actions.site_settings' ) )
			) {
				return;
			}

			// Get iframe window
			var iframeWindow = $usb.iframe.contentWindow;

			/**
			 * @type {{}} Current site settings (import from iframe)
			 */
			self.liveOptions = $ush.clone( ( iframeWindow.usGlobalData || {} ).liveOptions || {} );

			// Set first saved live options
			if ( $.isEmptyObject( _$tmp.savedLiveOptions ) ) {
				_$tmp.savedLiveOptions = $ush.clone( self.liveOptions );
			}

			// Hide preloader in panel
			$usb.panel.hidePreloader();
		},

		/**
		 * Clear the panel body
		 *
		 * @event handler
		 */
		_handlerClearBody: function() {
			var self = this;
			self._destroyFieldset(); // destroy initialized fieldset
			$usb.postMessage( 'clearCookies' ); // clear cookie data for previews
		}
	} );

	// Site Settings API
	$.extend( prototype, {

		/**
		 * Determines if ready
		 *
		 * @return {Boolean} True if ready, False otherwise
		 */
		isReady: function() {
			return ! $ush.isUndefined( this.$container );
		},

		/**
		 * Determines if settings changed
		 *
		 * @return {Boolean} True if settings changed, False otherwise
		 */
		isChanged: function() {
			return ! $ush.comparePlainObject( _$tmp.savedLiveOptions, this.liveOptions || {} );
		},

		/**
		 * Determines if process save
		 *
		 * @return {Boolean} True if process save, False otherwise
		 */
		isProcessSave: function() {
			return _$tmp.isProcessSave;
		},

		/**
		 * Show the general menu of setup groups
		 */
		showGeneralMenu: function() {
			var self = this;
			// If the document is not read, exit
			if ( ! self.isReady() ) {
				return;
			}

			// Panel preparation
			$usb.panel.setTitle( 'site_settings', /* isTranslationKey */true );
			$usb.trigger( 'panel.clearBody' ); // clear the panel body
			self.$menu.removeClass( 'hidden' ); // show menu
		},

		/**
		 * Handler for clicking on a settings group
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_clickGroupId: function( e ) {
			var groupId = $usbcore.$attr( e.currentTarget, 'data-group-id' );
			if ( groupId ) {
				$usb.urlManager.setParam( 'group', groupId ).push();
			}
		},

		/**
		 * Click go to back
		 *
		 * @event handler
		 */
		_clickGoToBack: function() {
			$usb.urlManager.removeParam( 'group' ).push();
		},

		/**
		 * Initialize fieldset for a settings group by name
		 *
		 * @param {String} groupId The group id
		 */
		initFieldset: function( groupId ) {
			var self = this;
			if ( $ush.isUndefined( _$tmp.fieldsets[ groupId ] ) ) {
				return;
			}
			self.$menu.addClass( 'hidden' ); // hide menu

			// Set shortcode title to header title
			var groupTitle = $usb.config( 'site.group_titles.' + groupId );
			if ( groupTitle ) {
				$usb.panel.setTitle( groupTitle );
			}

			// Set value to variables
			self.$activeFieldset = $( _$tmp.fieldsets[ groupId ] );
			// Note: Add html before field initialization so that all data is loaded,
			// for example: 'window.$usof.colorList'
			$usb.$panelBody.prepend( self.$activeFieldset );

			self.selectedGroupId = groupId;
			self.activeFieldset = new $usof.GroupParams( self.$activeFieldset );

			// Set value to fieldsets
			self.$activeFieldset.addClass( 'inited usof-container' );
			self.activeFieldset.setValues( self.liveOptions || {}, /* quiet mode */true );

			// Initialization check and watch on field events
			for ( var fieldId in self.activeFieldset.fields ) {
				self.activeFieldset.fields[ fieldId ]
					.on( 'change', self._events.changeField )
					// Responsive screen change handler in the $usof.field
					.on( 'syncResponsiveState', function( _, screenName ) {
						// Set a responsive screen from $usof the field
						if ( $usb.find( 'preview' ) ) {
							$usb.preview.fieldSetResponsiveScreen( screenName );
						}
					} );
			}
		},

		/**
		 * Destroy initialized fieldset
		 */
		_destroyFieldset: function() {
			var self = this;
			if ( ! self.selectedGroupId ) {
				return;
			}

			// Remove a node
			if ( self.$activeFieldset instanceof $ ) {
				self.$activeFieldset.remove();
			}

			self.$menu.addClass( 'hidden' ); // hide menu

			// Remove handlers for `$usof.field` objects
			self.activeFieldset = null;
			self.selectedGroupId = null;
		},

		/**
		 * Field changes for a fieldsets
		 *
		 * @event handler
		 * @param {$usof.field|$usof.Group} usofField
		 * @param {*} _ The usofField value
		 */
		_changeField: function( usofField ) {
			var self = this;

			// If the param does not exist, then exit
			if ( $ush.isUndefined( self.liveOptions[ usofField.name ] ) ) {
				return;
			}

			var isGroup = usofField instanceof $usof.Group,
				isField = usofField instanceof $usof.field;

			// If the object is not a field or a group then exit the method
			if ( ! ( isField || isGroup ) ) {
				return;
			}

			var // Get new param value
				value = usofField.getValue(),
				// Get field type
				fieldType = ( isField ? usofField.type : 'group' ),
				// Get usb-params from field or group
				usbParams = usofField[ isField ? '$row' : '$field' ].data( 'usb-params' ) || {},
				// The get and normalization of instructions
				instructions = $usb._normalizeInstructions( usbParams['usb_preview'] );

			// TODO: Fix from forced cast to data type as responsive fields are built on string format
			if ( fieldType == 'typography_options' ) {
				value = $ush.toPlainObject( value );
			}

			// If the value has not changed, then exit
			var oldValue = self.liveOptions[ usofField.name ];
			if ( $.isPlainObject( value ) ) {
				if ( $ush.comparePlainObject( oldValue, value ) ) {
					return;
				}
			} else if ( oldValue === value ) {
				return;
			}

			// Set new value
			self.liveOptions[ usofField.name ] = value;

			// Apply the changes to the preview page
			if ( instructions ) {
				// Get changed data
				var _changed = JSON.stringify( $usbcore.diffPlainObject( self.liveOptions, _$tmp.savedLiveOptions ) );

				$usb.postMessage( 'onPreviewChange', [
					instructions, // instructions to update previews
					value, // values of the field to be updated
					fieldType, // fieldType $usof.field type
					/* additional data */{
						changed: $ush.base64Encode( _changed ), // changed data in json+base64 format
						liveOptions: $ush.toString( self.liveOptions ) // live options
					}
				] );
			}

			// Switch for enable/disable save button
			$ush.debounce_fn_10ms( function() {
				$usb.panel.switchSaveButton( /* enable */self.isChanged() );
			} );
		},

		/**
		 * Save site settings changes
		 *
		 * @event handler
		 */
		_saveChanges: function() {
			var self = this;
			if (
				self.isProcessSave()
				|| ! self.isChanged()
				|| ! $usb.urlManager.hasParam( 'action', $usb.config( 'actions.site_settings' ) )
			) {
				return;
			}

			// Disable button and enable load
			$usb.panel.switchSaveButton( /* enable */true, /* isLoading */true );
			_$tmp.isProcessSave = true; // set the save execution flag

			// Send data to server
			$usb.ajax( /* request id */'_saveLiveOptions', {
				data: {
					_nonce: $usb.config( '_nonce' ),
					action: $usb.config( 'action_save_live_options' ),
					live_options: JSON.stringify( self.liveOptions )
				},
				// Handler to be called if the request succeeds
				success: function( res ) {
					if ( ! res.success ) {
						return;
					}
					$usb.notify.add( $usb.getTextTranslation( 'site_settings_updated' ), _NOTIFY_TYPE_.SUCCESS );

					// Clear cookie data for previews
					$usb.postMessage( 'clearCookies' );

					// Save the last site settings
					_$tmp.savedLiveOptions = $ush.clone( self.liveOptions );
				},
				// Handler to be called when the request finishes (after success and error callbacks are executed)
				complete: function() {
					_$tmp.isProcessSave = false;
					$usb.panel.switchSaveButton( /* enable */false );
				}
			} );
		}
	} );

	// Export API
	$usb.siteSettings = new SiteSettings( /* container */'#usb-site-settings' );

} ( jQuery );
