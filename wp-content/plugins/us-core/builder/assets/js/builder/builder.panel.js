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
! function( $, _undefined ) {

	const _window = window;

	if ( ! _window.$usb ) {
		return;
	}

	// Check for is set availability objects
	_window.$ush = _window.$ush || {};
	_window.$usbcore = _window.$usbcore || {};

	/**
	 * @type {RegExp} Regular expression for finding builder IDs
	 */
	const REGEXP_USBID_ATTR = /(\s?usbid="([^\"]+)?")/g;

	/**
	 * @type {{}} Private temp data
	 */
	let _$tmp = {
		elmsFieldset: {}, // fieldset for elements
		isFieldsetsLoaded: false, // this param will be True when fieldsets are loaded otherwise it will be False
	};

	/**
	 * @class Builder Panel - Functionality of the main builder panel (left sidebar)
	 */
	function BuilderPanel() {
		const self = this;

		/**
		 * @type {USOF Fieldset} Active fieldset object
		 */
		self.activeElmFieldset;

		/**
		 * @type {Node} Active fieldset node
		 */
		self.$activeElmFieldset;

		// Bondable events
		self._events = {
			contentChange: self._contentChange.bind( self ),
			iframeReady: self._iframeReady.bind( self ),
			resetSearch: self._resetSearch.bind( self ),
			saveChanges: self._saveChanges.bind( self ),
			searchElms: self._searchElms.bind( self ),
			showAddElms: self._showAddElms.bind( self ),
			submitPreviewChanges: self._submitPreviewChanges.bind( self ),
			switchPanel: self._switchPanel.bind( self ),
			switchTabs: self.$$fieldsets._switchTabs.bind( self ), // specific location
			urlManager: self._urlManager.bind( self ),

			// Import content
			changeImportContent: self._changeImportContent.bind( self ),
			saveImportContent: self._saveImportContent.bind( self ),
			showImportContent: self._showImportContent.bind( self ),

			// Fieldsets
			afterHideField: self._afterHideField.bind( self ),
			changeDesignField: self._changeDesignField.bind( self ),
			changeField: self._changeField.bind( self ),
		};

		$( () => {

			// Elements
			self.$tabElements = $( '.usb-panel-tab-elements', $usb.$panel );
			self.$elms = $( '.usb-panel-elms', $usb.$panel );
				// Search
				self.$searchElms = $( '[data-search-text]', $usb.$panel );
				self.$searchField = $( 'input[name=search]', self.$elms );
				self.$searchNoResult = $( '.usb-panel-search-noresult', self.$elms );
				// Import content
				self.$importContent = $( '.usb-panel-import-content', $usb.$panel );
				self.$importTextarea = $( '.usb-panel-import-content textarea:first', $usb.$panel );

			// Actions
			self.$actionSaveImportContent = $( '.usb_action_save_import_content', $usb.$panel );
			self.$actionAddElms = $( '.usb_action_show_add_elms', $usb.panel.$header );
			self.$actionTabAddElms = $( '.usb_action_tab_add_elms', self.$tabElements );

			// Set the builder to editor mode
			if ( $usb.panel.isShow() ) {
				$usb.builder.setMode( 'editor' );
			}

			// Events
			$usb.$panel
				// Toggles the USOF tabs of the settings panel
				.on( 'click', '.usof-tabs-item', self._events.switchTabs )
				// Show the add elements
				.on( 'click', '.usb_action_show_add_elms', self._events.showAddElms )
				.on( 'click', '.usb_action_tab_add_elms', self._events.showAddElms )
				// Create revision and show a preview page
				.on( 'submit', 'form#wp-preview', self._events.submitPreviewChanges )
				// Show import content `Paste Row/Section`
				.on( 'click', '.usb_action_show_import_content', self._events.showImportContent )
				// Changes in the import content
				.on( 'change input blur', '.usb-panel-import-content textarea', self._events.changeImportContent )
				// Save pasted content button
				.on( 'click', '.usb_action_save_import_content', self._events.saveImportContent );
			self.$elms
				// Search box character input
				.on( 'input', 'input[name=search]', $ush.debounce( self._events.searchElms, 1 ) )
				// Reset search
				.on( 'click', '.usb_action_reset_search_in_panel', self._events.resetSearch );


			// Run URL manager after ready
			self._urlManager( $usb.urlManager.getDataOfChange() );

		} );

		// Private events
		$usb
			.on( 'iframeReady', self._events.iframeReady ) // read document in iframe handler
			.on( 'builder.contentChange', self._events.contentChange ) // сontent change handler
			.on( 'panel.switch', self._events.switchPanel ) // switch show/hide panel
			.on( 'panel.showAddElms', self._events.showAddElms ) // handler for show the add elements
			.on( 'panel.clearBody', self.clearBody.bind( self ) ) // handler for clear panel body
			.on( 'panel.saveChanges', self._events.saveChanges ) // save changes to the backend
			.on( 'hotkeys.ctrl+s', self._events.saveChanges ) // save changes by `(command|ctrl)+s`
			.on( 'urlManager.changed', self._events.urlManager ); // URL history stack change handler
	}

	/**
	 * @type {Prototype}
	 */
	const prototype = BuilderPanel.prototype;

	// Panel API
	$.extend( prototype, $ush.mixinEvents, {
		/**
		 * Hide all sections in panel
		 *
		 * @event handler
		 * TODO: Debug the panel cleanup
		 */
		clearBody: function() {
			const self = this;
			self._hideImportContent(); // hide the import content (Paste Row/Section)
			self._hideAddElms(); // hide the section "Add elements"
			self._destroyElmFieldset(); // destroy a set of fields for an element
		},

		/**
		 * Switch show/hide panel
		 *
		 * @event handler
		 */
		_switchPanel: function() {
			var isShow = $usb.panel.isShow(),
				doActionArgs = 'hideEditableHighlight',
				selectedElmId = $usb.find( 'builder.selectedElmId' );

			if ( isShow && selectedElmId ) {
				doActionArgs = [ 'showEditableHighlight', selectedElmId ];
			}

			$usb.postMessage( 'doAction', doActionArgs );
			$usb.builder.setMode( isShow ? 'editor' : 'preview' );
		},

		/**
		 * Search for elements by name
		 *
		 * @event handler
		 */
		_searchElms: function() {
			var self = this,
				$input = self.$searchField,
				isFoundResult = true,
				value = $ush.toLowerCase( $input[0].value ).trim();
			$input
				.next( '.usb_action_reset_search_in_panel' )
				.toggleClass( 'hidden', ! value );
			self.$searchElms
				.toggleClass( 'hidden', !! value );
			if ( value ) {
				isFoundResult = !! self.$searchElms
					.filter( '[data-search-text^="' + value + '"], [data-search-text*="' + value + '"]' )
					.removeClass( 'hidden' )
					.length;
			}
			$( '.usb-panel-elms-list', self.$elms ).each( function( _, list ) {
				var listIsEmpty = ! $( '[data-search-text]:not(.hidden)', list ).length;
				$( list )
					.toggleClass( 'hidden', listIsEmpty )
					.prev( '.usb-panel-elms-header' )
					.toggleClass( 'hidden', listIsEmpty );
			} );
			self.$searchNoResult.toggleClass( 'hidden', isFoundResult );
		},

		/**
		 * Reset search
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
		 * Handler for create revision and show a preview page
		 * Note: Going to the change preview page creates the revision for which data is needed `post_conent`
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_submitPreviewChanges: function( e ) {
			var self = this;
			// Add data before send
			$( 'textarea[name="post_content"]', e.target )
				.val( $usb.builder.pageData.content );
			// Add data for custom page css (Metadata)
			$( 'textarea[name='+ $usb.config( 'keyCustomCss', '' ) +']', e.target )
				.val( $usb.builder.pageData.customCss );
		},

		/**
		 * Save post content changes
		 *
		 * @event handler
		 */
		_saveChanges: function() {
			var self = this;
			if (
				$usb.urlManager.hasParam( 'active', 'site_settings' )
				|| ! $usb.builder.isPageChanged()
				|| $usb.builder.isProcessSave()
			) {
				return;
			}

			// Disable button and enable load
			$usb.panel.switchSaveButton( /* enable */true, /* isLoading */true );

			// Save page data on the server
			$usb.builder.savePageData( /* complete */function() {
				$usb.panel.switchSaveButton( /* enable */false );
			} );
		},

		/**
		 * The handler is called after any changes on the page
		 *
		 * @event handler
		 */
		_contentChange: function() {
			$usb.panel.switchSaveButton( /* enable */$usb.builder.isPageChanged() );
		},

		/**
		 *
		 * The handler for show the add elements
		 * Note: The "Site Settings" handler is subscribed to this event
		 *
		 * @event handler
		 */
		_showAddElms: function() {
			$usb.urlManager.removeParam( 'active' ).push();
			this.showAddElms();
		},

		/**
		 * Show the section "Add elements"
		 */
		showAddElms: function() {
			const self = this;

			let $actionAddElms = self.$actionAddElms;
			if ( self.$tabElements.is( ':visible' ) ) {
				return;
			}

			$usb.trigger( 'panel.clearBody' ); // hide all sections
			$usb.navigator.resetActive(); // reset an active element in navigator
			$usb.panel.clearBody();
			$usb.postMessage( 'doAction', 'hideHighlight' );
			$usb.builder.setMode( 'editor' ); // set editor mode

			$actionAddElms // set active class to add button
				.addClass( 'active' );

			$usb.builder.selectedElmId = null;

			// Set focus to search field (Focus does not work when the developer console is open!)
			$ush.timeout( function() {
				self.$searchField[0].focus();
			}, 10 );

			self.$tabElements // show all list elements
				.removeClass('hidden');

			// Selected Tab "Elements"
			if ( ! self.$actionTabAddElms.hasClass( 'active' ) ) {
				self.$actionTabAddElms.trigger( 'click' );
			}

			// Set the panel header title
			$usb.panel.setTitle( /* get action title */$actionAddElms.attr( 'title' ) );

			// Init Drag & Drop
			$usb.builder.initDragDrop();
		},

		/**
		 * Hide the section "Add elements"
		 */
		_hideAddElms: function() {
			var self = this;
			if ( ! $usb.panel.isReady() ) {
				return;
			}
			self.$actionAddElms // remove active class from button
				.removeClass( 'active' );
			self.$tabElements // hide all elements
				.addClass('hidden');

			// Destroy Drag & Drop
			$usb.builder.destroyDragDrop();
		},

		/**
		 * Handler of change or move event on the history stack
		 *
		 * @event handler
		 * @param {{}|undefined} state Data object associated with history and current loaction
		 */
		_urlManager: function( state ) {
			var self = this,
				setParams = state.setParams;
			// If the document is not read, exit
			if ( ! $usb.panel.isReady() ) {
				return;
			}
			// Show "Add elements"
			if (
				! setParams.active
				&& ! $usb.find( 'builder.selectedElmId' )
				&& setParams.action != $usb.config( 'actions.site_settings' )
			) {
				self.showAddElms();
			}
			// Show "Paste Row/Section"
			else if ( setParams.active == 'paste_row' ) {
				self.showImportContent();
			}
		}

	} );

	// Import content (Paste Row/Section)
	$.extend( prototype, {

		/**
		 * Show import content
		 */
		showImportContent: function() {
			const self = this;
			self.clearBody(); // hide all sections
			$usb.builder.setMode( 'editor' ); // set editor mode
			$usb.navigator.resetActive(); // reset an active element in navigator
			$usb.panel.clearBody();
			self.$importContent.removeClass( 'hidden' );
			// Clear field and set focus to it
			self.$importTextarea.val( '' ).removeClass( 'validate_error' );
			self.$importTextare[0].focus();
			// Disable save button
			self.$actionSaveImportContent
				.prop( 'disabled', true )
				.addClass( 'disabled' );
			// Set the header title
			$usb.panel.setTitle( 'paste_row', /* isTranslationKey */true );
			$usb.builder.selectedElmId = null;
		},

		/**
		 * Show import content
		 *
		 * @event handler
		 */
		_showImportContent: function() {
			$usb.urlManager.setParam( 'active', 'paste_row' ).push();
		},

		/**
		 * Hide import content
		 */
		_hideImportContent: function() {
			var self = this;
			if ( $usb.panel.isReady() ) {
				self.$importContent.addClass( 'hidden' );
			}
		},

		/**
		 * Pasted content change handler
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_changeImportContent: function( e ) {
			var self = this;
			$usb.notify.closeAll(); // close all notifications

			var target = e.target,
				pastedContent = target.value.trim();

			// Remove usbid's from pasted content
			if ( pastedContent.indexOf( 'usbid=' ) !== -1 ) {
				pastedContent = pastedContent.replace( REGEXP_USBID_ATTR, '' );
			}

			// Save the cleaned content
			if ( target.value !== pastedContent ) {
				target.value = pastedContent;
			}

			// Remove helper classes
			$( target ).removeClass( 'validate_error' );

			// Enable save button
			self.$actionSaveImportContent
				.prop( 'disabled', ! pastedContent )
				.toggleClass( 'disabled', ! pastedContent );
		},

		/**
		 * Save pasted content
		 *
		 * @event handler
		 */
		_saveImportContent: function() {
			var self = this,
				// Elements
				$textarea = self.$importTextarea,
				$saveButton = self.$actionSaveImportContent,
				// Get pasted content
				pastedContent = $textarea.val() || '';

			if ( ! pastedContent ) {
				// Disable save button
				$saveButton
					.prop( 'disabled', /* value */true )
					.addClass( 'disabled' );
				return;
			}

			// Remove html from start and end pasted сontent
			pastedContent = $usb.builder.removeHtmlWrap( pastedContent );

			// The check the correctness of the entered shortcode
			var isValid = ! (
				!/^\[vc_row([\s\S]*)\/vc_row\]$/gim.test( pastedContent )
				|| pastedContent.indexOf( '[vc_column' ) === -1
			);

			// Added helper classes
			$textarea.toggleClass( 'validate_error', ! isValid );

			// If there is an error, we will display a notification and complete the process
			if ( ! isValid ) {
				$usb.notify.add( $usb.getTextTranslation( 'invalid_data' ), _NOTIFY_TYPE_.ERROR );
				return;
			}

			// Disable the input field at the time of add content
			$textarea
				.prop( 'disabled', /* value */true )
				.addClass( 'disabled' );

			// Disable save button
			$saveButton
				.addClass( 'loading disabled' )
				.prop( 'disabled', /* value */true );

			// Add a unique usbid for each shortcode
			var elmId;
			pastedContent = pastedContent.replace( /\[(\w+)/g, function( match, tag, offset ) {
				var id = $usb.builder.getSpareElmId( tag );
				// Save the ID of the first shortcode, which should be `vc_row`
				if ( 0 === offset ) {
					elmId = id;
				}
				return match + ' usbid="' + id + '"';
			} );

			// Get default image
			var placeholder = $usb.config( 'placeholder', '' );

			// Search and replace use:placeholder
			pastedContent = pastedContent.replace( /use:placeholder/g, placeholder );

			// Replace images for new design options
			pastedContent = pastedContent.replace( /css="([^\"]+)"/g, function( matches, match ) {
				if ( match ) {
					var jsoncss = ( decodeURIComponent( match ) || '' )
						.replace( /("background-image":")(.*?)(")/g, function( _, before, id, after ) {
							return before + ( $ush.parseInt( id ) || placeholder ) + after;
						} );
					return 'css="%s"'.replace( '%s', encodeURIComponent( jsoncss ) );
				}
				return matches;
			} );

			// Check the post_type parameter
			pastedContent = pastedContent.replace( /\s?post_type="(.*?)"/g, function( match, post_type ) {
				if ( $usb.config( 'grid_post_types', [] ).indexOf( post_type ) === - 1 ) {
					return ' post_type="post"'; // default post_type
				}
				return match;
			} );

			// TODO: Determine the need for this filter
			// Remove [us_post_content..] if post type is not us_content_template
			// if ( self.data.post_type !== 'us_content_template' ) {
			// 	pastedContent = pastedContent.replace( /(\[us_post_content.*?])/g, '' );
			// }

			// Render pasted content
			$usb.builder.renderShortcode( '_renderPastedContent', {
				data: {
					content: pastedContent,
					isReturnContent: true, // Add content to the result (This can be useful for complex changes)
				},
				// Successful request handler
				success: function( res ) {
					if ( ! res.success || ! res.data.html ) {
						return;
					}

					// Commit to save changes to history
					$usb.history.commitChange( elmId, _CHANGED_ACTION_.CREATE );

					// Add pasted content to `$usb.builder.pageData.content`
					$usb.builder.pageData.content += (
						res.data.content || pastedContent.replace( /(grid_layout_data="([^"]+)")/g, 'items_layout=""' )
					);

					// Add html to the end of the document.
					$usb.postMessage( 'insertElm', [ $usb.builder.mainContainer, 'append', res.data.html, /* scroll into view */true ] );

					// Event for react in extensions
					$usb.trigger( 'builder.contentChange' );
				},
				// Handler to be called when the request finishes (after success and error callbacks are executed)
				complete: function( _, textStatus ) {
					var isSuccess = ( textStatus === 'success' );

					// Disable the loader and block m or display the button depend on its status
					$saveButton
						.prop( 'disabled', isSuccess )
						.removeClass( 'loading' )
						.toggleClass( 'disabled', isSuccess );

					// Enable input field
					$textarea
						.prop( 'disabled', /* value */false )
						.removeClass( 'disabled' );

					// Clear data on successful request
					if ( isSuccess ) {
						$textarea.val('');
					}
				}
			} );
		}
	} );

	// Initialize fieldset for element edit
	$.extend( prototype, {
		/**
		 * Load all deferred field sets or specified by name
		 *
		 * @param {String} name The fieldset name
		 */
		_loadDeferredFieldsets: function( name ) {
			var self = this;

			$usb.$panel.addClass( 'data_loading' );

			var // Data to send the request
				data = {},
				// AJAX request ID
				requestId = 'loadDeferredFieldsets';

			// Add a name to the data object for the request and change the name
			// for the request ID to ensure that data is received asynchronously
			if ( ! $ush.isUndefined( name ) ) {
				data.name = name;
				requestId += '.name';
				$usb.$panel
					.addClass( 'show_preloader' );
			}

			// Load the element and initialize it
			$usb.ajax( /* request id */requestId, {
				data: $.extend( data, {
					_nonce: $usb.config( '_nonce' ),
					action: $usb.config( 'action_get_deferred_fieldsets' ),
				} ),
				success: function( res ) {
					if ( ! res.success ) {
						return;
					}
					var fieldsets = $.isPlainObject( res.data )
						? res.data
						: {};

					for ( var name in fieldsets ) {
						if ( !! _$tmp.elmsFieldset[ name ] ) {
							continue;
						}
						_$tmp.elmsFieldset[ name ] = fieldsets[ name ];
						self.trigger( 'fieldsetLoaded', [ name ] ); // send a signal about the load of fieldsets
					}

					/*
					 * `data_loading` - Background data load
					 * `show_preloader` - Fieldset load pending
					 */
					var removeClasses = 'data_loading';
					if ( ! data.name ) {
						_$tmp.isFieldsetsLoaded = true; // load all fieldsets
						removeClasses += ' show_preloader';
					} else {
						removeClasses = ' show_preloader';
					}
					$usb.$panel.removeClass( removeClasses );
				}
			} );
		},

		/**
		 * Iframe ready event handler
		 *
		 * @event handler
		 */
		_iframeReady: function() {
			const self = this;
			$ush.timeout( self._loadDeferredFieldsets.bind( self ), 100 );
		},

		/**
		 * Initializes the elm fieldset
		 *
		 * @param {String} id Shortcode's usbid, e.g. "us_btn:1"
		 * @param {Function} callback Callback function that will be called after load the fieldset
		 */
		initElmFieldset: function( id, callback ) {
			const self = this;
			if ( ! $usb.builder.doesElmExist( id ) ) {
				return;
			}

			// Hide all sections in panel
			$usb.panel.clearBody();

			// Remove the 'active' param if it is set
			$usb.urlManager.removeParam( 'active' ).push();

			// Get element name
			var name = $usb.builder.getElmName( id ),
				elmsSupported = $usb.config( 'elms_supported', /* default */[] ),
				elmTitle = $usb.config( 'elm_titles.' + name, /* default */name ); // get element title

			// If there is no title, then the element does not support editing with the Live Builder
			if (
				! Array.isArray( elmsSupported )
				|| $usbcore.indexOf( name, elmsSupported ) < 0
			) {
				$usb.builder.selectedElmId = id;
				// Set shortcode title to panel title
				$usb.panel.setTitle( elmTitle );
				// Show the panel messages
				$usb.panel.showMessage( $usb.getTextTranslation( 'editing_not_supported' ) );
				// Set the active item in navigator
				$usb.navigator.setActive( id, /* expand parent */true );
				// Show highlight for editable element
				$usb.postMessage( 'doAction', [ 'showEditableHighlight', id ] );
				return;
			}

			// Trying to get a fieldset from a document
			if ( ! _$tmp.elmsFieldset[ name ] ) {
				$( '#usb-tmpl-fieldsets .usb-panel-fieldset[data-name]', $usb.$panel )
					.each( function( _, node ) {
						_$tmp.elmsFieldset[ $( node ).data( 'name' ) ] = node.outerHTML;
					} )
					.remove();
			}

			// If the fieldsets have not been loaded yet, wait for the load and then show the fieldset
			if ( ! _$tmp.elmsFieldset[ name ] && ! _$tmp.isFieldsetsLoaded ) {
				$usb.panel.setTitle( elmTitle );
				self // Watches the load of fieldsets
					.one( 'fieldsetLoaded', function( loadedName ) {
						if ( name !== loadedName ) return;
						self._showElmFieldset( id );
					} );
				// Load a set outside the general stream
				self._loadDeferredFieldsets( name );
				return;
			}

			self._showElmFieldset( id ); // show panel edit settings for shortcode
		},

		/**
		 * Show panel edit settings for shortcode
		 *
		 * @param {String} id Shortcode's usbid, e.g. "us_btn:1"
		 */
		_showElmFieldset: function( id ) {
			const self = this;
			if ( ! $usb.builder.doesElmExist( id ) ) {
				return;
			}

			// Get element name and for it
			var name = $usb.builder.getElmName( id );
			if ( ! name ) {
				return;
			}

			// Get element values
			var values = $usb.builder.getElmValues( id ) || {},
				defaultValues = $usb.config( 'shortcode.default_values.' + name, {} );

			// Set default params if there are no sets
			if ( $.isPlainObject( defaultValues ) ) {
				for ( var k in defaultValues ) if ( k !== 'content' ) {
					if ( $ush.isUndefined( values[ k ] ) ) {
						values[ k ] = defaultValues[ k ];
					}
				}
			}

			// Remove the `show_preloader` class if any
			if ( $usb.$panel.hasClass( 'show_preloader' ) ) {
				$usb.$panel.removeClass( 'show_preloader' );
			}

			$usb.trigger( 'panel.clearBody' ); // clear the panel body

			// Load assets required to initialize the code editor
			if ( $usb.config( 'dynamicFieldsetAssets.codeEditor', [] ).indexOf( name ) > -1 ) {
				self._loadAssetsForCodeEditor();
			}

			// Set value to variables
			self.$activeElmFieldset = $( _$tmp.elmsFieldset[ name ] );
			// Note: Add html before field initialization so that all data is loaded,
			// for example: 'window.$usof.colorList'
			$usb.$panelBody.prepend( self.$activeElmFieldset );

			$usb.builder.selectedElmId = id;
			self.activeElmFieldset = new $usof.GroupParams( self.$activeElmFieldset );

			// Set shortcode title to header title
			$usb.panel.setTitle( $usb.builder.getElmTitle( id ) );

			// Set value to fieldsets
			self.$activeElmFieldset.addClass( 'inited usof-container' );
			self.activeElmFieldset.setValues( values, /* quiet mode */true );

			// Set the current responsive screen for $usof fields selected for edit
			if ( $usb.find( 'preview' ) ) {
				$usb.preview.setFieldResponsiveScreen();
			}

			// Initialization check and watch on field events
			// Note: The id is passed explicitly as a parameter because the callback function can be
			// called with a delay, especially when selecting elements quickly `.bind( self, id )`
			for ( var fieldId in self.activeElmFieldset.fields ) {
				var field = self.activeElmFieldset.fields[ fieldId ];
				field
					.on( 'change', self._events.changeField.bind( self, id ) ) // TODO:Add debounce
					.on( 'afterHide', self._events.afterHideField )
					// The event only exists in the `design_options`
					.on( 'changeDesignField', self._events.changeDesignField.bind( self, id ) )
					// Responsive screen change handler in the $usof.field
					.on( 'syncResponsiveState', function( _, screenName ) {
						// Set a responsive screen from $usof the field
						if ( $usb.find( 'preview' ) ) {
							$usb.preview.fieldSetResponsiveScreen( screenName );
						}
					} )
					// Delegate an event from the TinyMCE to a built-in handler (keydown comes from the TinyMCE iframe)
					.on( 'tinyMCE.Keydown', function( /* usofField */_, /* event */e ) {
						$usb._events.keydown( e );
					} );
			}

			// Initialization check and watch on group events
			for ( var groupName in ( self.activeElmFieldset.groups || {} ) ) {
				self.activeElmFieldset.groups[ groupName ]
				// TODO: There shouldn't be a debounce here, you need to check all events and remove it
				.on( 'change', $ush.debounce( self._events.changeField.bind( self, id ), 1 ) );
			}

			// Adds tabs data
			if ( self.activeElmFieldset.isGroupParams ) {
				self.activeElmFieldset.$tabsItems = $( '.usof-tabs-item', self.$activeElmFieldset );
				self.activeElmFieldset.$tabsSections = $( '.usof-tabs-section', self.$activeElmFieldset );
				// Run the method to check for visible fields and control the show of tabs
				self.$$fieldsets.autoShowingTabs();
			}

			$usb.builder.trigger( 'panel.afterInitFieldset' ); // trigger of the completed fieldset

			// Show highlight for editable element
			$usb.postMessage( 'doAction', [ 'showEditableHighlight', id ] );
		},

		/**
		 * Destroy a set of fields for an element
		 */
		_destroyElmFieldset: function() {
			const self = this;
			if (
				! $usb.panel.isReady()
				|| ! self.activeElmFieldset
			) {
				return;
			}
			// Remove a node
			if ( self.$activeElmFieldset instanceof $ ) {
				self.$activeElmFieldset.remove();
			}
			// Remove all handlers for `$usof.field` objects
			$usb.$document.off( 'usb.syncResponsiveState' );
			// Hide highlight for editable element
			$usb.postMessage( 'doAction', 'hideEditableHighlight' );
			// Destroy all data
			$usb.builder.selectedElmId = null;
			self.activeElmFieldset = null;
			self.$activeElmFieldset = null;
		},

		/**
		 * Load assets required to initialize the code editor
		 */
		_loadAssetsForCodeEditor: function() {
			var codeEditorAssets = ( _window.usGlobalData.deferredAssets || {} )[ 'codeEditor' ] || '';
			if ( codeEditorAssets ) {
				$usb.$body.append( codeEditorAssets );
				delete _window.usGlobalData.deferredAssets[ 'codeEditor' ];
			}
		},

		/**
		 * Field changes for a design_options
		 *
		 * Note: The selectedElmId is passed explicitly as a parameter because the callback
		 * function can be called with a delay, especially when selecting elements quickly
		 *
		 * @param {String} selectedElmId Shortcode's usbid, e.g. "us_btn:1"
		 * @param {$usof.field|$usof.Group} field
		 * @param {$usof.field} designField
		 */
		_changeDesignField: function( selectedElmId, field, designField ) {
			if ( field.type !== 'design_options' ) {
				return;
			}
			this._changeField( selectedElmId, designField, designField.getValue(), /* skip save option */true );
		},

		/**
		 * Update the shortcode with a frequency of 1ms
		 * Note: The code is moved to a separate function since `throttled` must be initialized before call
		 *
		 * @param {Function} fn The function to be executed
		 * @type throttled
		 */
		__updateShortcode: $ush.throttle( $ush.fn, 1, /* no_trailing */true ),

		/**
		 * Update content after 150ms
		 * Note: The code is moved to a separate function since `debounced` must be initialized before call
		 *
		 * @param {Function} fn The function to be executed
		 * @type debounced
		 */
		__updateShortcode_long: $ush.debounce( $ush.fn, 150 ),

		/**
		 * Update of instructions from a delay of 1s
		 * Note: The code is moved to a separate function since `throttled` must be initialized before call
		 *
		 * @param {Function} fn The function to be executed
		 * @type throttled
		 */
		__updateOnInstructions_long: $ush.throttle( $ush.fn, 1000/* 1s */ ),

		/**
		 * Field changes for a fieldsets
		 *
		 * Note: The selectedElmId is passed explicitly as a parameter because the callback
		 * function can be called with a delay, especially when selecting elements quickly
		 *
		 * @event handler
		 * @param {String} selectedElmId Shortcode's usbid, e.g. "us_btn:1"
		 * @param {$usof.field|$usof.Group} usofField
		 * @param {*} _ The usofField value
		 * @param {Boolean} _skipSave Skip save option
		 */
		_changeField: function( selectedElmId, usofField, _, _skipSave ) {
			const self = this;

			// Run the method to check for visible fields and control the show of tabs
			// Note: In this call, it is important to pass `this` because the object is isolated!
			self.$$fieldsets.autoShowingTabs.call( self );

			// If there is no editable element, then exit the method
			if ( ! selectedElmId || selectedElmId !== $usb.builder.selectedElmId ) {
				return;
			}

			const isGroup = usofField instanceof $usof.Group;
			const isField = usofField instanceof $usof.field;

			// If the object is not a field or a group then exit the method
			if ( ! ( isField || isGroup ) ) {
				return;
			}

			let // Get new param value
				value = usofField.getValue(),
				// Get field type
				fieldType = ( isField ? usofField.type : 'group' ),
				// Get usb-params from field or group
				usbParams = usofField[ isField ? '$row' : '$container' ].data( 'usb-params' ) || {},
				// The get and normalization of instructions
				instructions = $usb._normalizeInstructions( usbParams['usb_preview'] );

			/**
			 * @type {{}} The data stack for the current change call
			 */
			let _currentData = {
				elmType: $usb.builder.getElmType( selectedElmId ), // the element type
				fieldType: fieldType, // the field type
				id: selectedElmId, // the ID of selected element
				instructions: instructions, // the instructions for updating the preview
				isChangeDesignOptions: ( fieldType === 'design_options' ), // the design options updates
				// Note: Only a field can have a responsive value, not a group
				isResponsiveValue: ( isField ? usofField.isResponsiveValue( value ) : false ), // the responsive values
				name: ( usofField.name || usofField.groupName ), // the field name
				usofField: usofField, // the field object reference
				value: value, // the new value
			};

			// Execute callback functions if any
			if ( Array.isArray( instructions ) ) {

				// Get a list of callback functions for parameters
				var previewCallbacks = $.isPlainObject( _window.usGlobalData.previewCallbacks )
					? _window.usGlobalData.previewCallbacks
					: {};
				for ( const i in instructions ) {
					const funcName = $ush.toLowerCase( _currentData.elmType + '_' + _currentData.name );
					if (
						! instructions[ i ][ 'callback' ]
						|| typeof previewCallbacks[ funcName ] !== 'function'
					) {
						continue;
					}
					try {
						instructions = previewCallbacks[ funcName ]( _currentData.value ) || /* default */true;
					} catch ( err ) {
						$usb.log( 'Error executing callback function in instructions', err );
					}
				}
				// The normalization of instructions
				_currentData.instructions = $usb._normalizeInstructions( instructions );
			}

			// TODO: This needs to be fixed as this is a temporary solution, the problem is in the design settings control events!
			if (
				(
					_currentData.isChangeDesignOptions
					&& $ush.rawurldecode( value ).indexOf( '"background-image":"{{' ) > -1
				)
				|| (
					_currentData.name === 'background-image'
					&& $ush.toString( value ).indexOf( '{{' ) > -1
				)
			) {
				instructions = true;
				_skipSave = false;
			}

			/**
			 * @type {Boolean} Determine the progress of the recovery task
			 */
			_currentData.isActiveRecoveryTask = $usb.history.isActiveRecoveryTask();

			/**
			 * Update shortcode
			 *
			 * @param {{}} _currentData Current call data stack
			 * @return {Deferred} Returns a new deferred object.
			 */
			const _updateShortcode = ( _currentData ) => {
				const deferred = $.Deferred();
				const originalId = _currentData.id;

				let isUpdated = false;

				let oldShortcode = $usb.builder.getElmShortcode( originalId );
				if ( ! oldShortcode || _skipSave ) {
					return deferred.reject( isUpdated );
				}

				/**
				 * Shortcode which stores the type as content
				 * Note: `content` is a reserved name which implies that the values are the content of the
				 * shortcode for example: [example]content[/example]
				 */
				const isContent = (
					_currentData.fieldType === 'editor'
					|| _currentData.name === 'content'
				);
				const hasDefaultValue = _currentData.usofField.getDefaultValue() === _currentData.value;

				let shortcodeObj = $usb.builder.parseShortcode( oldShortcode );
				let atts = $usb.builder.parseAtts( shortcodeObj.atts );

				// Updating shortcode attributes
				if ( isContent || hasDefaultValue ) {
					delete atts[ _currentData.name ];
				} else {
					atts[ _currentData.name ] = _currentData.value;
				}
				shortcodeObj.atts = $usb.builder.buildAtts( atts );

				// Set value in shortcode content
				if ( isContent ) {
					shortcodeObj.content = _currentData.value;
				}

				// Get string shortcode
				let newShortcode = $usb.builder.buildShortcode( shortcodeObj ),
					oldParentShortcode; // the parent shortcode for the events of the year, children change, but the parent needs to be updated

				isUpdated = ( oldShortcode !== newShortcode && ! _currentData.isActiveRecoveryTask );

				// Get parent shortcode
				if ( _currentData.instructions === true && $usb.builder.isReloadParentElm( originalId ) ) {
					_currentData.id = $usb.builder.getElmParentId( _currentData.id );
					oldParentShortcode = $usb.builder.getElmShortcode( _currentData.id );
				}

				// Save shortcode to page content
				if ( isUpdated ) {
					$usb.builder.pageData.content = $ush
						.toString( $usb.builder.pageData.content )
						.replace( oldShortcode, newShortcode );
					$ush.debounce_fn_1ms( () => {
						$usb.trigger( 'builder.contentChange' );
					} );
				}

				// Get parent and update it
				if ( oldParentShortcode ) {
					oldShortcode = oldParentShortcode;
					newShortcode = $usb.builder.getElmShortcode( _currentData.id );
				}

				// Update columns or columns_layout settings
				if (
					isUpdated
					&& _currentData.elmType.indexOf( 'vc_row' ) === 0
					&& [ 'columns', 'columns_layout' ].includes( _currentData.name )
					&& $usb.builder._updateColumnsLayout( _currentData.id, _currentData.value )
				) {
					$usb.postMessage( 'showPreloader', _currentData.id );
					$usb.builder.renderShortcode( 'renderShortcode', {
						data: {
							content: $usb.builder.getElmShortcode( _currentData.id ),
						},
						success: ( res ) => {
							if ( res.success ) {
								$usb.postMessage( 'updateSelectedElm', [ _currentData.id, $ush.toString( res.data.html ) ] );
							}
						},
						complete: () => { deferred.resolve( isUpdated ); }
					} );

				} else {
					deferred.resolve( isUpdated );
				}

				// If the content of the shortcode has changed, commit to the change history
				if ( isUpdated ) {
					/**
					 * Save last changes to cache (It is important to get the data before call `_updateShortcode`)
					 * Note: The cache provides correct data when multiple threads `debounce` or `throttle` are run.
					 * TODO: Find solution to race problem (get/update, update/get) from using timeout
					 */
					$usb.history.setLatestShortcodeUpdate( {
						content: oldShortcode,
						preview: $usb.builder.getElmOuterHtml( _currentData.id )
					} );

					let commitArgs = [ _currentData.id, _CHANGED_ACTION_.UPDATE ];

					// Determining the field type whether the spacing is needed or not
					commitArgs.push( $usb.config( 'useThrottleForFields', [] ).indexOf( _currentData.usofField.type ) > -1 );

					// Add external end-to-end data
					if ( oldParentShortcode ) {
						commitArgs.push( { originalId: originalId } );
					}

					// Commit to save changes to history
					$usb.history.commitChange.apply( $usb.history, commitArgs );
				}

				return deferred;
			};

			/**
			 * @type {Data} Data class instance
			 */
			const cache = $usbcore.cache( '_changeField' );

			// Update the shortcode with a specified delay and receive data from the server
			if ( _skipSave !== true && instructions === true && ! _currentData.isActiveRecoveryTask ) {
				_updateShortcode( _currentData ).always( ( isUpdated ) => {
					// Note: If there is an item update, let's remember it, because the parameter can
					// depend on the activation of other parameters, which will cause the event queue,
					// and only the last one will be handled. We should not lose the update as it is
					// usually a complex structure change
					if ( isUpdated && instructions === true ) {
						cache.set( 'shortcodeChanged', instructions );
					}

					self.__updateShortcode_long( () => {
						if ( ! isUpdated && ! cache.get( 'shortcodeChanged' ) ) {
							return;
						}
						cache.flush(); // Flushes an instance

						// Gets element ID to reboot
						let elmId = $usb.builder.getElmParentId( _currentData.id );
						if ( ! $usb.builder.isReloadElm( elmId ) ) {
							elmId = _currentData.id;
						}

						// Reload element in preview
						$usb.builder.reloadElmInPreview( elmId, () => {
							$usb.builder.trigger( 'shortcodeChanged', _currentData );
						} );
					} );
				} );
			}

			// Update the shortcode at a specified frequency
			else if ( instructions !== true ) {
				/**
				 * Update on instructions and data
				 *
				 * @param {{}} _currentData Current call data stack
				 */
				const _updateOnInstructions = ( _currentData ) => {
					_updateShortcode( _currentData ).always( ( isUpdated ) => {
						// If the shortcode data has not changed or there are no instructions,
						// then we will complete the execution at this stage
						if ( ! isUpdated || $ush.isUndefined( _currentData.instructions ) ) {
							return;
						}
						// Converts a value string representation to a plain object
						if ( _currentData.isResponsiveValue ) {
							_currentData.value = $ush.toPlainObject( _currentData.value );
						}
						// Spot update styles, classes or other parameters
						$usb.postMessage( 'onPreviewParamChange', [
							_currentData.id,
							_currentData.instructions,
							_currentData.value,
							_currentData.fieldType,
							_currentData.isResponsiveValue
						] );
						$usb.builder.trigger( 'shortcodeChanged', _currentData );
					} );
				};

				/**
				 * Select a wrapper to apply an interval or delay
				 */
				const _switchUpdateOnInstructions = () => {
					if ( _skipSave === true ) {
						return;
					}
					// The update occurs at a long interval
					if ( $usb.config( 'useLongUpdateForFields', [] ).includes( _currentData.usofField.type ) ) {
						self.__updateOnInstructions_long( _updateOnInstructions.bind( self, _currentData ) );
					} else {
						_updateOnInstructions( _currentData );
					}
				};

				// Check if we are doing preview changes for design options
				if ( _currentData.isChangeDesignOptions ) {
					const _value = unescape( $ush.toString( _currentData.value ) );
					// Get the ID of an attachment to check for loaded
					const attachmentId = $ush.parseInt( ( _value.match( /"background-image":"(\d+)"/ ) || [] )[1] );
					if ( attachmentId && ! $usb.getAttachmentUrl( attachmentId ) ) {
						// In case the design options have background image and it's info wasn't loaded yet ...
						// ... fire preview change event only after trying to load the image info
						( $usb.getAttachment( attachmentId ) || { fetch: $.noop } ).fetch( {
							success: _switchUpdateOnInstructions
						} );
					} else {
						_switchUpdateOnInstructions();
					}

					// For fields with type other than design options, just fire preview change event
				} else {
					_switchUpdateOnInstructions();
				}
			}
		},

		/**
		 * Field handler after hidden for a fieldsets
		 *
		 * @event handler
		 * @param {$usof.field} usofField The field object
		 */
		_afterHideField: function( usofField ) {
			// Set default value for hidden field
			if ( usofField instanceof $usof.field && usofField.inited ) {
				usofField.setValue( usofField.getDefaultValue(), /* not quiet */false );
			}
		}
	} );

	// Functionality for the implementation of Fieldsets
	prototype.$$fieldsets = {
		/**
		 * Switch USOF tabs
		 *
		 * @event handler
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_switchTabs: function( e ) {
			var $target = $( e.currentTarget ),
				$sections = $target
					.parents( '.usof-tabs:first' )
					.find( '> .usof-tabs-sections > *' );

			// This is toggle the tab title
			$target
				.addClass( 'active' )
				.siblings()
				.removeClass( 'active' );

			// This is toggle the tab sections
			$sections
				.removeAttr( 'style' )
				.eq( $target.index() )
				.addClass( 'active' )
				.siblings()
				.removeClass( 'active' );
		},

		/**
		 * Auto show or hidden of tabs for fieldsets
		 */
		autoShowingTabs: function() {
			var self = this;
			if ( ! self.activeElmFieldset || ! self.activeElmFieldset.isGroupParams ) {
				return;
			}
			$.each( self.activeElmFieldset.$tabsSections, function( index, section ) {
				var fields = $( '> *', section ).toArray(),
					isHidden = true;
				for ( var k in fields ) {
					var $field = $( fields[ k ] ),
						isShown = $field.data( 'isShown' );
					if ( $ush.isUndefined( isShown ) ) {
						isShown = ( $field.css( 'display' ) != 'none' );
					}
					if ( isShown ) {
						isHidden = false;
						break;
					}
				}
				self.activeElmFieldset.$tabsItems
					.eq( index )
					.toggleClass( 'hidden', isHidden );
			} );
		}
	};

	// Export API
	$usb.builderPanel = new BuilderPanel;

} ( jQuery );
