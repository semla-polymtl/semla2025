/**
 * USOF Field: Editor
 */
! function( $, undefined ) {

	var _window = window,
		_undefined = undefined;

	if ( _window.$usof === _undefined ) {
		return;
	}

	$usof.field[ 'editor' ] = {
		/**
		 * Initializes the object.
		 */
		init: function() {
			var self = this;

			// Elements
			self.$container = $( '.usof-editor', self.$row );

			// Delete template
			$( 'script.usof-editor-template', self.$container )
				.remove();

			// Variables
			self.hasUndoRedo = false;
			self.originalEditorId = self.$input.data( 'editor-id' ) || 'usof_editor';
			self.originalEditorSettings = _window.tinyMCEPreInit.mceInit[ self.originalEditorId ] || {};

			// Load editor settings
			var $editorSettings = $( '.usof-editor-settings', self.$row );
			self.editorSettings = $editorSettings.is( '[onclick]' )
				? $editorSettings[ 0 ].onclick() || {}
				: {};

			// Since there could be several instances of the field with same original ID, ...
			// ... adding random part to the ID
			self.editorId = self.originalEditorId + $ush.uniqid();
			self.$input.attr( 'id', self.editorId );

			// Bondable events.
			self._events = {
				changeField: self._changeField.bind( self ),
				changeTinymceContent: self._changeTinymceContent.bind( self )
			};

			// Events
			self.$container
				.on( ( self.isLiveBuilder() ? 'input' : 'change' ), 'textarea', self._events.changeField );

			self.initEditor();
		},

		/**
		 * Init WP Editor for USOF
		 *
		 * @docs https://www.tiny.cloud/docs/api/
		 */
		initEditor: function() {
			if ( ! _window.wp || ! _window.wp.editor ) {
				return;
			}
			var self = this;
			// At initialization, add monitoring for content changes
			_window.tinymce.on( 'AddEditor', function( e ) {
				var _editor = e.editor;
				if ( _editor.id !== self.editorId ) {
					return;
				}
				// Event type: `input` or `change`
				var eventType = 'NodeChange ' + ( self.isLiveBuilder() ? 'input' : 'change' );
				_editor
					.off( eventType )
					.on( eventType, self._events.changeTinymceContent );
				// Correction for editors on the usbuilder page.
				if ( self.isLiveBuilder() ) {
					_editor
						// Delegating an event to an internal event controller.
						.on( 'keydown', self.trigger.bind( self, 'tinyMCE.Keydown' ) )
						// Disable Undo Redo in usbuilder, there is a change manager.
						.on( 'BeforeAddUndo', function( e ) {
							// Return true if the link is being edited,
							// otherwise errors may occur in the editor
							return ! $ush.isUndefined( e.originalEvent ); // false
						} );
				}
			}, /* prepend */true );

			// Init editors
			$ush.timeout( function() {
				var editorSettings = {
						quicktags: true,
						tinymce: self.editorSettings.tinymce || {},
						mediaButtons: ( self.editorSettings.media_buttons !== _undefined )
							? self.editorSettings.media_buttons
							: true
					},
					qtSettings = {
						id: self.editorId,
						buttons: "strong,em,link,block,del,ins,img,ul,ol,li,code,more,close"
					},
					settingsFields = [
						'content_css',
						'toolbar1',
						'toolbar2',
						'toolbar3',
						'toolbar4',
						'theme',
						'skin',
						'language',
						'formats',
						'relative_urls',
						'remove_script_host',
						'convert_urls',
						'browser_spellcheck',
						'fix_list_elements',
						'entities',
						'entity_encoding',
						'keep_styles',
						'resize',
						'menubar',
						'branding',
						'preview_styles',
						'end_container_on_empty_block',
						'wpeditimage_html5_captions',
						'wp_lang_attr',
						'wp_keep_scroll_position',
						'wp_shortcut_labels',
						'plugins',
						'wpautop',
						'indent',
						'tabfocus_elements',
						'textcolor_map',
						'textcolor_rows',
					];

				settingsFields.forEach( function( setting, index ) {
					if ( self.originalEditorSettings[ setting ] !== _undefined ) {
						editorSettings.tinymce[ setting ] = self.originalEditorSettings[ setting ];
					}
				} );

				// We will not execute the installer since it is mostly used by third-party plugins,
				// for example WPML, at the moment the standard functionality is enough for us.
				editorSettings.tinymce.setup = $.noop;

				// TODO check if we shoud and can remove all other editors in builder mode
				_window.wp.editor.initialize( self.editorId, editorSettings );
				_window.quicktags( qtSettings );

				self.switchEditors( 'tinymce' ); // open by default

			}, 1 );
		},

		/**
		 * Switcher editors.
		 *
		 * @param {string} modeThe mode
		 */
		switchEditors: function( mode ) {
			var self = this;
			mode = ( '' + mode ).toLowerCase();
			$( '#' + self.editorId + '-' + ( mode === 'tinymce' ? 'tmce' : 'html' ), self.$container )
				.trigger( 'click' );
		},

		/**
		 * Field change event
		 *
		 * @param {Event} e The Event interface represents an event which takes place in the DOM
		 */
		_changeField: function( e ) {
			this.trigger( 'change', e.currentTarget.value );
		},

		/**
		 * Content change handler in TinyMCE
		 *
		 * @param {Event} e TinyMCE Event
		 */
		_changeTinymceContent: function( e ) {
			var self = this,
				// Making sure both values are string and do not match each other
				mceValue = '' + _window.tinymce.get( self.editorId ).getContent(),
				currentValue = '' + self.getValue();
			// If they are same, breaking following execution
			if ( currentValue === mceValue ) {
				return;
			}
			// If they are different, saving the changes in our value field and triggering change event
			self.$input.val( mceValue );
			self.trigger( 'change', mceValue );
		},

		/**
		 * Sets the value
		 *
		 * @param {string} value The value
		 * @param {boolean} quiet The quiet
		 */
		setValue: function( value, quiet ) {
			var self = this;
			// Set value to tinyMCE
			if ( !! _window.tinyMCE && !! _window.tinyMCE.get( self.editorId ) ) {
				_window.tinyMCE.get( self.editorId ).setContent( value );
			} else {
				self.$input.val( value );
			}
			if ( quiet ) {
				self.trigger( 'change', value );
			}
		},

		/**
		 * Gets the value
		 *
		 * @return {string} The value
		 */
		getValue: function() {
			return this.$input.val() || '';
		}
	};
}( jQuery );
