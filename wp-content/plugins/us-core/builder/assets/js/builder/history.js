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
	_window.$usof = _window.$usof || {};
	_window.$usbcore = _window.$usbcore || {};

	/**
	 * @type {{}} The type of data history used
	 */
	const _HISTORY_TYPE_ = {
		REDO: 'redo',
		UNDO: 'undo'
	};

	/**
	 * @type {{}} Actions that are applied when content changes
	 */
	// const _CHANGED_ACTION_ = {
	// 	CALLBACK: 'callback', // recovery via callback function
	// 	CREATE: 'create', // create new shortcode and add to content
	// 	MOVE: 'move', // move shortcode
	// 	REMOVE: 'remove', // remove shortcode from content
	// 	UPDATE: 'update' // update shortcode in content
	// };

	/**
	 * @type {{}} Data change history stack
	 */
	var _$changesHistory = {
		redo: [], // data redo stack
		tasks: [], // all tasks to recover
		undo: [] // data undo stack
	};

	/**
	 * @type {{}} Private temp data
	 */
	var _$tmp = {
		isActiveRecoveryTask: false, // active data recovery process
		_latestShortcodeUpdate: {}, // latest updated shortcode data (The cache provides correct data when multiple threads `debounce` or `throttle` are run)
	};

	/**
	 * @class History - Functionality for keeping a history of changes on the page, which allows you to undo or restore changes
	 */
	function History() {
		var self = this;

		/**
		 * @type {{}} Bondable events
		 */
		self._events = {
			historyChanged: self._historyChanged.bind( self ),
			redoChange: self._redoChange.bind( self ),
			undoChange: self._undoChange.bind( self ),
		};

		$( function() {

			// Actions
			self.$actionUndo = $( '.usb_action_undo', $usb.$panel );
			self.$actionRedo = $( '.usb_action_redo', $usb.$panel );

			// Events
			$usb.$panel
				// Handler for the undo button in the panel
				.on( 'click', '.usb_action_undo', self._events.undoChange )
				// Handler for the redo button in the panel
				.on( 'click', '.usb_action_redo', self._events.redoChange );
		} );

		// Private events
		$usb
			.on( 'hotkeys.ctrl+z', self._events.undoChange ) // for hotkey `(command|ctrl)+z`
			.on( 'hotkeys.ctrl+shift+z', self._events.redoChange ); // for hotkey `(command|ctrl)+shift+z`

		self.on( 'historyChanged', self._events.historyChanged ); // history change handler

	}

	// History API
	$.extend( History.prototype, $ush.mixinEvents, {

		/**
		 * Undo handler
		 *
		 * @event handler
		 */
		_undoChange: function() {
			this._createRecoveryTask( _HISTORY_TYPE_.UNDO );
		},

		/**
		 * Redo handler
		 *
		 * @event handler
		 */
		_redoChange: function() {
			this._createRecoveryTask( _HISTORY_TYPE_.REDO );
		},

		/**
		 * Handler for changes in the data history, the method will
		 * be called every time the data in the history has changed
		 *
		 * @event handler
		 */
		_historyChanged: function() {
			var self = this;
			[ // Controll the operation and display of undo/redo buttons
				{ $btn: self.$actionUndo, disabled: ! self.getLengthUndo() },
				{ $btn: self.$actionRedo, disabled: ! self.getLengthRedo() }
			].map( function( i ) {
				i.$btn
					// Data recovery in process
					.toggleClass( 'recovery_process', !! self.getLengthTasks() )
					// Disable or enable buttons
					.toggleClass( 'disabled', i.disabled )
					.prop( 'disabled', i.disabled )
			} );
		},

		/**
		 * Get the length of 'undo'
		 *
		 * @return {Number}
		 */
		getLengthUndo: function() {
			return _$changesHistory.undo.length;
		},

		/**
		 * Get the length of 'redo'
		 *
		 * @return {Number}
		 */
		getLengthRedo: function() {
			return _$changesHistory.redo.length;
		},

		/**
		 * Get the length of 'tasks'
		 *
		 * @return {Number}
		 */
		getLengthTasks: function() {
			return _$changesHistory.tasks.length;
		},

		/**
		 * Get the last history data by action
		 *
		 * @param {String} action The action name
		 * @return {{}} Returns the last data object for the action
		 */
		getLastHistoryDataByAction: function( action ) {
			var lastData,
				self = this,
				undo = _$changesHistory.undo;
			if (
				self.getLengthUndo()
				&& $usbcore.indexOf( action, _CHANGED_ACTION_ ) > -1
			) {
				for ( var i = self.getLengthUndo() -1; i >= 0; i-- ) {
					if ( ( undo[ i ] || {} ).action === action ) {
						lastData = $ush.clone( undo[ i ] );
						break;
					}
				}
			}
			return lastData || {};
		},

		/**
		 * Sets the latest shortcode update.
		 *
		 * @param {{}} data The data.
		 */
		setLatestShortcodeUpdate: function( data ) {
			_$tmp._latestShortcodeUpdate = $ush.toPlainObject( data );
		},

		/**
		 * Determines if active recovery task
		 *
		 * @return {Boolean} True if active recovery task, False otherwise
		 */
		isActiveRecoveryTask: function() {
			return !! _$tmp.isActiveRecoveryTask;
		},

		/**
		 * Save data to history by interval
		 * Note: The code is moved to a separate function since `throttle` must be initialized before call
		 *
		 * @param {Function} fn The function to be executed
		 * @type throttle
		 */
		__saveDataToHistory: $ush.throttle( $ush.fn, 2000/* 2s */, /* no_trailing */true ),

		/**
		 * Commit to save changes to history
		 * Note: This method is designed to work only with builder elements
		 *
		 * @param {String} id Shortcode's usbid, e.g. "us_btn:1"
		 * @param {String} action The action that is executed to apply the changes
		 * @param {Boolean} useThrottle Using the interval when save data
		 * @param {{}} extData External end-to-end data
		 */
		commitChange: function( id, action, useThrottle, extData ) {
			var self = this;
			if (
				! action
				|| ! $usb.builder.isValidId( id )
				|| self.isActiveRecoveryTask()
				|| $usbcore.indexOf( action, _CHANGED_ACTION_ ) < 0
			) {
				return;
			}

			/**
			 * @type {Function} Save change data in history
			 */
			var saveDataToHistory = function() {
				/**
				 * @type {{}} The current data of the shortcode before apply the action
				 */
				var data = {
					action: action,
					id: id,
					extData: $.isPlainObject( extData ) ? extData : {},
				};

				// Get and save the position of an element
				if ( $usbcore.indexOf( action, [ _CHANGED_ACTION_.MOVE, _CHANGED_ACTION_.REMOVE ] ) > -1 ) {
					data.index = $usb.builder.getElmIndex( id );
					data.parentId = $usb.builder.getElmParentId( id );
				}
				// Get and save the preview of an element
				if ( $usbcore.indexOf( action, [ _CHANGED_ACTION_.UPDATE, _CHANGED_ACTION_.REMOVE ] ) > -1 ) {
					data.content = $usb.builder.getElmShortcode( id );
					data.preview = $usb.builder.getElmOuterHtml( id );

					// Сheck the load of the element, if the preview contains the class for update the element,
					// then we will skip save to history
					var pcre = new RegExp( 'class="(.*)?'+ $usb.config( 'className.elmLoad', 'usb-elm-loading' ) +'(\s|")' );
					if ( data.preview && pcre.test( data.preview ) ) {
						return;
					}
				}
				/**
				 * Get data from shared cache
				 * Note: The cache provides correct data when multiple threads `debounce` or `throttle` are run
				 */
				if ( _CHANGED_ACTION_.UPDATE === action && ! $.isEmptyObject( _$tmp._latestShortcodeUpdate ) ) {
					$.extend( data, _$tmp._latestShortcodeUpdate );
					_$tmp._latestShortcodeUpdate = {};
				}

				// Get parameters before delete, this will help restore the element
				if ( _CHANGED_ACTION_.REMOVE === action ) {
					data.values = $usb.builder.getElmValues( id );
				}

				// Check against the latest data to eliminate duplicates
				if ( _CHANGED_ACTION_.UPDATE === action ) {

					// Get the last history data by action
					var lastData = self.getLastHistoryDataByAction( _CHANGED_ACTION_.UPDATE );

					// Check for duplicate objects
					var props = [ 'index', 'parentId', 'timestamp' ]; // properties to remove
					if (
						! $.isEmptyObject( lastData )
						&& $ush.comparePlainObject(
							$usbcore.clearPlainObject( lastData, props ),
							$usbcore.clearPlainObject( data, props )
						)
					) {
						return;
					}
				}

				// If the maximum limit is exceeded, then we will delete the old data
				if ( self.getLengthUndo() >= $ush.parseInt( $usb.config( 'maxDataHistory', /* default */100 ) ) ) {
					_$changesHistory.undo = _$changesHistory.undo.slice( 1 );
				}

				// Save data in `undo` and destroy `redo`
				_$changesHistory.undo.push( $.extend( data, { timestamp: Date.now() } ) );
				_$changesHistory.redo = [];

				self.trigger( 'historyChanged' );
			};

			// Save data with and without interval
			if ( !! useThrottle ) {
				self.__saveDataToHistory( saveDataToHistory );
			} else {
				saveDataToHistory();
			}
		},

		/**
		 * Commit to save data to history
		 * Note: This method is for store arbitrary data and restore via a callback function
		 *
		 * @param {*} data The commit data
		 * @param {Function} callback The restore callback function
		 * @param {Boolean} useThrottle Using the interval when save data
		 */
		commitData: function( customData, callback, useThrottle ) {
			var self = this;
			if (
				$ush.isUndefined( customData )
				|| typeof callback !== 'function'
			) {
				return;
			}

			/**
			 * @type {Function} Save change data in history
			 */
			var saveDataToHistory = function() {
				var data = {
					action: _CHANGED_ACTION_.CALLBACK,
					callback: callback,
					data: customData
				};

				// Get the last history data by action
				var lastData = self.getLastHistoryDataByAction( _CHANGED_ACTION_.CALLBACK );

				// Check for duplicate objects
				if (
					! $.isEmptyObject( lastData )
					&& $ush.comparePlainObject(
						$usbcore.clearPlainObject( lastData, [ 'callback', 'timestamp' ] ),
						$usbcore.clearPlainObject( data, 'callback' )
					)
				) {
					return;
				}

				// If the maximum limit is exceeded, then we will delete the old data
				if ( self.getLengthUndo() >= $ush.parseInt( $usb.config( 'maxDataHistory', /* default */100 ) ) ) {
					_$changesHistory.undo = _$changesHistory.undo.slice( 1 );
				}

				// Save data in `undo` and destroy `redo`
				_$changesHistory.undo.push( $.extend( data, { timestamp: Date.now() } ) );
				_$changesHistory.redo = [];

				self.trigger( 'historyChanged' );
			};

			// Save data with and without interval
			if ( !! useThrottle ) {
				self.__saveDataToHistory( saveDataToHistory );
			} else {
				saveDataToHistory();
			}
		},

		/**
		 * Create a recovery task
		 *
		 * @param {Number} type Task type, the value can be or greater or less than zero
		 */
		_createRecoveryTask: function( type ) {
			var self = this;
			// Check the correctness of the task type
			if ( ! type || $usbcore.indexOf( type, [ _HISTORY_TYPE_.UNDO, _HISTORY_TYPE_.REDO ] ) < 0 ) {
				return;
			}

			var task, // Found recovery task
				lengthUndo = self.getLengthUndo(),
				lengthRedo = self.getLengthRedo();

			// Get data from `undo`
			if ( type === _HISTORY_TYPE_.UNDO && lengthUndo ) {
				task = _$changesHistory.undo[ --lengthUndo ];
				_$changesHistory.undo = _$changesHistory.undo.slice( 0, lengthUndo );
			}
			// Get data from `redo`
			if ( type === _HISTORY_TYPE_.REDO && lengthRedo ) {
				task = _$changesHistory.redo[ --lengthRedo ];
				_$changesHistory.redo = _$changesHistory.redo.slice( 0, lengthRedo );
			}

			// Add a recovery task to the queue
			if ( ! $.isEmptyObject( task ) ) {
				_$changesHistory.tasks.push( $ush.clone( task, { _source: type } ) );
				self.trigger( 'historyChanged' );
				self.__startRecoveryTasks.call( self ); // apply all recovery tasks
			}
		},

		/**
		 * Start all recovery tasks
		 * Note: The code is moved to a separate function since `debounced` must be initialized before call
		 *
		 * @param {Function} fn The function to be executed
		 * @type debounced
		 */
		__startRecoveryTasks: $ush.debounce( function() {
			var self = this;
			if ( self.isActiveRecoveryTask() ) {
				return;
			}
			// Launch Task Manager
			_$tmp.isActiveRecoveryTask = true;
			self._recoveryTaskManager();
		}, 100 ),

		/**
		 * Recovery Task Manager
		 * Note: Manage and apply tasks from a shared queue for data recovery
		 */
		_recoveryTaskManager: function() {
			var self = this,
				lengthTasks = self.getLengthTasks(),
				task = _$changesHistory.tasks[ --lengthTasks ]; // get last task

			// Check the availability of the task
			if ( $.isEmptyObject( task ) ) {
				_$tmp.isActiveRecoveryTask = false;
				self.trigger( 'historyChanged' );
				return;
			}

			// Remove the task from the general list
			_$changesHistory.tasks = _$changesHistory.tasks.slice( 0, lengthTasks );

			/**
			 * Apply changes from task
			 * Note: Timeout will allow to collect data and update the task before recovery
			 */
			$ush.timeout( self._applyChangesFromTask.bind( self, $ush.clone( task ), /* originalTask */task ), 1 );

			// Reverse actions Create/Remove in a task
			switch( task.action ) {
				case _CHANGED_ACTION_.CREATE:
					task.action = _CHANGED_ACTION_.REMOVE;
					break;
				case _CHANGED_ACTION_.REMOVE:
					task.action = _CHANGED_ACTION_.CREATE;
					break;
			}

			// Get and save the preview of an element
			if ( $usbcore.indexOf( task.action, [ _CHANGED_ACTION_.UPDATE, _CHANGED_ACTION_.REMOVE ] ) > -1 ) {
				task.content = $usb.builder.getElmShortcode( task.id );
				task.preview = $usb.builder.getElmOuterHtml( task.id );
			}

			// Position updates on movements
			if ( $usbcore.indexOf( task.action, [ _CHANGED_ACTION_.MOVE, _CHANGED_ACTION_.REMOVE ] ) > -1 ) {
				task.index = $usb.builder.getElmIndex( task.id );
				task.parentId = $usb.builder.getElmParentId( task.id );
			}

			// Move task in the opposite direction
			var _source = task._source;
			delete task._source;
			if ( _source === _HISTORY_TYPE_.UNDO ) {
				_$changesHistory.redo.push( task );
			} else {
				_$changesHistory.undo.push( task );
			}
		},

		/**
		 * Apply changes from task
		 *
		 * @param {{}} task Cloned version of the task
		 * @param {{}} originalTask Task object from history
		 */
		_applyChangesFromTask: function( task, originalTask ) {
			var self = this;
			if ( $.isEmptyObject( task ) ) {
				_$tmp.isActiveRecoveryTask = false;
				return;
			}
			// Сheck the validation of the task
			if ( ! task.action ) {
				$usb.log( 'Error: Invalid change action:', task );
				return;
			}

			// Data recovery depend on the applied action
			if ( task.action === _CHANGED_ACTION_.CREATE ) {
				$usb.builder.removeElm( task.id );

				// Move the element to a new position
			} else if ( task.action === _CHANGED_ACTION_.MOVE ) {
				$usb.builder.moveElm( task.id, task.parentId, task.index );

				// Create the element
			} else if ( task.action === _CHANGED_ACTION_.REMOVE ) {
				// Added shortcode to content
				if ( ! $usb.builder._addShortcodeToContent( task.parentId, task.index, task.content ) ) {
					return false;
				}
				// Get insert position
				var insert = $usb.builder.getInsertPosition( task.parentId, task.index );
				// Add new shortcde to preview page
				$usb.postMessage( 'insertElm', [ insert.parent, insert.position, '' + task.preview ] );
				$usb.postMessage( 'maybeInitElmJS', [ task.id ] ); // init its JS if needed
				// Update element from task
			} else if ( task.action === _CHANGED_ACTION_.UPDATE ) {
				// Shortcode updates
				$usb.builder.pageData.content = ( '' + $usb.builder.pageData.content )
					.replace( $usb.builder.getElmShortcode( task.id ), task.content );
				// Refresh shortcode preview
				$usb.postMessage( 'updateSelectedElm', [ task.id, '' + task.preview ] );

				// Refresh data in edit active fieldset
				var id = ( task.extData || {} ).originalId || task.id;
				if ( id === $usb.builder.selectedElmId && $usb.builderPanel.activeElmFieldset instanceof $usof.GroupParams ) {
					$usb.builderPanel.activeElmFieldset.setValues( $usb.builder.getElmValues( $usb.builder.selectedElmId ), /* quiet mode */true );
				}

				// Pass the committed data to a custom handle
			} else if ( task.action === _CHANGED_ACTION_.CALLBACK ) {
				// If there is a handler, then call it and pass the captured data
				if ( typeof task.callback === 'function' ) {
					task.callback.call( self, $ush.clone( task ).data, originalTask );
				}

			} else {
				$usb.log( 'Error: Unknown recovery action:', action );
				return;
			}

			// Trigger the content change event
			if ( $usbcore.indexOf( task.action, [ _CHANGED_ACTION_.UPDATE, _CHANGED_ACTION_.REMOVE ] ) > -1 ) {
				$usb.trigger( 'builder.contentChange' );
			}

			// Trigger the event to work out the controls parts
			self.trigger( 'historyChanged' );

			// Call the task manager for further process of the task list
			// Note: Timeout helps to avoid recovery bugs when the browser is loaded
			$ush.timeout( self._recoveryTaskManager.bind( self ), 1 );
		}
	} );

	// Export API
	$usb.history = new History;

} ( jQuery );
