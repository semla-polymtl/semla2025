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
		isInputCustomCss: false, // flag for enter custom styles in the editor
		pageFieldset: {}, // fieldsets for other components, example: page custom css, page settings etc.
	};

	/**
	 * @class Page - Functionality for customizing the page, styles or metadata of the edited page
	 */
	function Page() {
		var self = this;

		/**
		 * @type {{}} Bondable events
		 */
		self._events = {
			changePageCustomCss: self._changePageCustomCss.bind( self ),
			changePageMeta: self._changePageMeta.bind( self ),
			changeSettings: self._changeSettings.bind( self ),
			handlerClearBody: self._handlerClearBody.bind( self ),
			iframeReady: self._iframeReady.bind( self ),
			setParamsForSettings: self._setParamsForSettings.bind( self ),
			showCustomCss: self._showCustomCss.bind( self ),
			showSettings: self._showSettings.bind( self ),
			urlManager: self._urlManager.bind( self ),
		};

		$( function() {

			// Elements
			self.$pageSettings = $( '.usb-panel-page-settings', $usb.$panel );
			self.$pageCustomCss = $( '.usb-panel-page-custom-css', $usb.$panel );

			// Actions
			self.$actionShowCustomCss = $( '.usb_action_show_page_custom_css', $usb.$panel );
			self.$actionShowSettings = $( '.usb_action_show_page_settings', $usb.$panel );

			// Events
			$usb.$panel
				// Handler for show page settings
				.on( 'click', '.usb_action_show_page_settings', self._events.showSettings )
				// Handler for show custom css input for the page
				.on( 'click', '.usb_action_show_page_custom_css', self._events.showCustomCss );

			// Run URL manager after ready
			self._urlManager( $usb.urlManager.getDataOfChange() );
		} );

		// Private events
		$usb
			.on( 'iframeReady', self._events.iframeReady ) // read document in iframe handler
			.on( 'panel.clearBody', self._events.handlerClearBody ) // handler for clear the panel body
			.on( 'urlManager.changed', self._events.urlManager ); // URL history stack change handler
	}

	/**
	 * @type {Prototype}
	 */
	var prototype = Page.prototype;

	// Private Events
	$.extend( prototype, $ush.mixinEvents, {
		/**
		 * Handler of change or move event on the history stack
		 *
		 * @event handler
		 * @param {{}|undefined} state Data object associated with history and current loaction
		 */
		_urlManager: function( state ) {
			var self = this;
			// If the document is not read, exit
			if ( ! self.isReady() ) {
				return;
			}
			// Show "Page Settings"
			if ( state.setParams.active == 'page_settings' ) {
				self.showSettings();
			}
			// Show "Page Custom Css"
			else if ( state.setParams.active == 'page_custom_css' ) {
				if ( ! $usb.iframeIsReady ) {
					$usb.one( 'iframeReady', self.showCustomCss.bind( self ) );
				} else {
					self.showCustomCss();
				}
			}
		},

		/**
		 * Iframe ready event handler
		 *
		 * @event handler
		 */
		_iframeReady: function() {
			var self = this;
			// Check if there is a css set the label
			if ( $usb.builder.pageData.customCss ) {
				self.$actionShowCustomCss.addClass( 'css_not_empty' );
			}
		},

		/**
		 * Clear the panel body
		 *
		 * @event handler
		 */
		_handlerClearBody: function() {
			var self = this;
			if ( ! self.isReady() ) {
				return;
			}
			self._hideSettings(); // hide the settings
			self._hideCustomCss(); // hide the custom css
		}
	} );

	// Page API
	$.extend( prototype, {
		/**
		 * Determines if ready.
		 *
		 * @return {Boolean} True if ready, False otherwise
		 */
		isReady: function() {
			return ! $ush.isUndefined( this.$pageSettings );
		},

		/**
		 * Show the page settings.
		 *
		 * @event handler
		 */
		_showSettings: function() {
			$usb.urlManager.setParam( 'active', 'page_settings' ).push();
		},

		/**
		 * Show the page settings.
		 */
		showSettings: function () {
			var self = this;
			// Fields initialization for page fields
			if ( ! ( _$tmp.pageFieldset.pageFields instanceof $usof.GroupParams ) ) {
				var pageFields = new $usof.GroupParams( $( '.for_page_fields', self.$pageSettings )[/*first*/0] );
				for ( var k in pageFields.fields ) {
					pageFields.fields[ k ].on( 'change', $ush.debounce( self._events.changeSettings, 1 ) );
				}
				_$tmp.pageFieldset.pageFields = pageFields;
			}
			// Fields initialization for meta data
			if ( ! ( _$tmp.pageFieldset.pageMeta instanceof $usof.GroupParams ) ) {
				var pageMeta = new $usof.GroupParams( $( '.usb-panel-page-meta', self.$pageSettings )[/*first*/0] );
				for ( var k in pageMeta.fields ) {
					pageMeta.fields[ k ].on( 'change', $ush.debounce( self._events.changePageMeta, 1 ) );
				}
				_$tmp.pageFieldset.pageMeta = pageMeta;
			}

			// Set params for fieldsets in page settings
			self._setParamsForSettings();

			$usb.panel.clearBody(); // clear the panel body
			$usb.navigator.resetActive(); // reset an active element in navigator
			self.$pageSettings.removeClass( 'hidden' );
			self.$actionShowSettings.addClass( 'active' );

			// Set the header title
			$usb.panel.setTitle( 'page_settings', /* isTranslationKey */true );
		},

		/**
		 * Hide the page settings.
		 */
		_hideSettings: function() {
			var self = this;
			self.$pageSettings.addClass( 'hidden' );
			self.$actionShowSettings.removeClass( 'active' );
		},

		/**
		 * Set params for fieldsets in page settings.
		 */
		_setParamsForSettings: function() {
			var self = this;
			if ( ! $usb.iframeIsReady ) {
				$usb.one( 'iframeReady', self._events.setParamsForSettings );
				self.$pageSettings // add a preloader for loading data
					.addClass( 'data_loading' );
				return;
			}

			// Object references for code optimization
			var pageData = $usb.builder.pageData,
				pageMeta = _$tmp.pageFieldset.pageMeta,
				pageFields = _$tmp.pageFieldset.pageFields;

			// Set values for page fields
			if ( pageFields instanceof $usof.GroupParams ) {
				pageFields.setValues( pageData.fields, /* quiet mode */true );
				$.extend( pageData.fields, pageFields.getValues() ); // force for data type compatibility
			}
			// Set values for meta data
			if ( pageMeta instanceof $usof.GroupParams ) {
				pageMeta.setValues( pageData.pageMeta, /* quiet mode */true );
				$.extend( pageData.pageMeta, pageMeta.getValues() ); // force for data type compatibility
			}
			self.$pageSettings
				.removeClass( 'data_loading' );
		},

		/**
		 * Handler for сhange in custom css.
		 *
		 * @event handler
		 * @param {$usof.field} usofField
		 * @param {*} value
		 */
		_changeSettings: function( usofField, value ) {
			if ( ! ( usofField instanceof $usof.field ) ) {
				return;
			}
			const name = usofField.name;

			// Check the parameter changes
			if ( $usb.builder.pageData.fields[ name ] === value ) {
				return;
			}

			// Update field
			$usb.builder.pageData.fields[ name ] = value;

			// Set post_title in preview page
			if ( name === 'post_title' ) {
				document.title = $usb.config( 'adminPageTitleMask', value ).replace( '%s', value );

				const selectors = '.post_title:not([class*="usg_post_title_"]), head > title';
				$usb.postMessage( 'updateElmContent', [
					/* selectors */'.post_title:not([class*="usg_post_title_"]), head > title', value, /* method */'text'
				] );
			}

			// Reload Preview Page (Data change check happens inside the method)
			if (
				name === 'thumbnail_id'
				&& ( usofField.$row.data( 'usb-params' ) || {} ).usb_preview === true
			) {
				$usb.builder._isReloadPreviewAfterSave = true;
			}

			$ush.debounce_fn_1ms( () => {
				$usb.trigger( 'builder.contentChange' );
			} );
		},

		/**
		 * Handler for сhange in page meta data.
		 * Note: The second parameter in the method is passed a value, but this may differ
		 * from ` arguments[1] !== usofField.getValue()` by data type. Example: `1,2` !== [1,2]
		 *
		 * @event handler
		 * @param {$usof.field} usofField
		 * @param {*} value
		 */
		_changePageMeta: function( usofField, value ) {
			if ( ! ( usofField instanceof $usof.field ) ) {
				return;
			}
			var self = this,
				name = usofField.name;

			// Check the parameter changes
			if ( $usb.builder.pageData.pageMeta[ name ] === value ) {
				return;
			}

			// Update the value for the name
			$usb.builder.pageData.pageMeta[ name ] = value;

			// Reload Preview Page (Data change check happens inside the method)
			if ( ( usofField.$row.data( 'usb-params' ) || {} ).usb_preview ) {
				$usb.builder._isReloadPreviewAfterSave = true;
			}

			// Event for react in extensions
			$ush.debounce_fn_1ms( function() {
				$usb.trigger( 'builder.contentChange' );
			} );
		},

		/**
		 * Show the page custom css.
		 *
		 * @event handler
		 */
		_showCustomCss: function() {
			$usb.urlManager.setParam( 'active', 'page_custom_css' ).push();
		},

		/**
		 * Show the page custom css.
		 */
		showCustomCss: function() {
			var self = this;
			// Load the code editor only after initialize the iframe,
			// due to load assets on demand from the iframe
			if ( ! $usb.iframeIsReady ) {
				$usb
					.off( 'iframeReady', self._events.showCustomCss )
					.one( 'iframeReady', self._events.showCustomCss );
				return;
			}

			// Load assets required to initialize the code editor
			$usb.builderPanel._loadAssetsForCodeEditor();

			// Fields initialization for page_custom_css
			if ( ! ( _$tmp.pageFieldset.pageCustomCss instanceof $usof.field ) ) {
				var pageCustomCss = new $usof.field( $( '.type_css', self.$pageCustomCss )[/* first */0] );
				pageCustomCss.init( pageCustomCss.$row );
				pageCustomCss.setValue( $usb.builder.pageData.customCss );
				pageCustomCss.on( 'change', $ush.debounce( self._events.changePageCustomCss, 1 ) );
				_$tmp.pageFieldset.pageCustomCss = pageCustomCss;
			}

			$usb.panel.clearBody(); // clear the panel body
			$usb.navigator.resetActive(); // reset an active element in navigator
			self.$pageCustomCss.removeClass( 'hidden' );
			self.$actionShowCustomCss.addClass( 'active' );

			// Set the header title
			$usb.panel.setTitle( 'page_custom_css', /* isTranslationKey */true );

			// Set the cursor at the end of exist content
			try {
				var cmInstance = _$tmp.pageFieldset.pageCustomCss.editor.codemirror;
				cmInstance.focus();
				cmInstance.setCursor( cmInstance.lineCount(), /* start position */0 );
			} catch( err ) {}
		},

		/**
		 * Hide the page custom css.
		 */
		_hideCustomCss: function() {
			var self = this;
			if ( self.isReady() ) {
				self.$pageCustomCss.addClass( 'hidden' );
				self.$actionShowCustomCss.removeClass( 'active' );
			}
		},

		/**
		 * Deferred execution function after a specified time.
		 *
		 * @type debounced
		 */
		__debounce_2s: $ush.debounce( $ush.fn, 2000/* 2s */ ),

		/**
		 * Handler for сhange in custom css.
		 *
		 * @event handler
		 * @param {$usof.field} usofField
		 * @param {String} pageCustomCss This is the actual value for any change.
		 */
		_changePageCustomCss: function( usofField, pageCustomCss ) {
			var self = this;
			// If Undo or Redo is used then we will cancel the execution
			// of the logic, since the built-in history will be used
			if ( $usb.hotkeys( /* undo */'ctrl+z', /* or redo */ 'ctrl+shift+z' ) ) {
				return;
			}

			/**
			 * @param {String} customCss Page Custom CSS
			 * @param {{}} originalTask This is a link to an object in history that can be modified
			 * @type {Function} Set custom styles to the builder and preview
			 */
			var setPageCustomCss = function( customCss, originalTask ) {
					if (
						$.type( customCss ) !== 'string'
						|| $usb.builder.pageData.customCss == customCss
					) {
						return;
					}

					// Style updates to editors and history when restore data from history
					if ( $usb.history.isActiveRecoveryTask() && $.isPlainObject( originalTask ) ) {
						_$tmp.pageFieldset.pageCustomCss.setValue( customCss );
						originalTask.data = '' + $usb.builder.pageData.customCss;
					}

					// Update page custom css.
					$usb.builder.pageData.customCss = customCss;
					// Update styles on the preview page
					$usb.postMessage( 'updatePageCustomCss', customCss );
					// Event for react in extensions
					$ush.debounce_fn_1ms( function() {
						$usb.trigger( 'builder.contentChange' );
					} );
					// Check if there is a css set the label
					self.$actionShowCustomCss
						.toggleClass( 'css_not_empty', !! customCss );
				};

			// Save the state before the update
			if ( ! _$tmp.isInputCustomCss ) {
				$usb.history.commitData( $usb.builder.pageData.customCss, setPageCustomCss );
				_$tmp.isInputCustomCss = true;
			}
			else {
				// Reset custom styles input flag after input is complete
				self.__debounce_2s( function() {
					_$tmp.isInputCustomCss = false;
				} );
			}

			// Set custom styles to the builder and preview
			setPageCustomCss( pageCustomCss );
		}
	} );

	// Export API
	$usb.page = new Page;

} ( jQuery );
