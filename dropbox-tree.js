(function() {

	if (typeof dtree == "undefined") {
		dtree = {};
	}

	function FileModel(title, key, type) {
		this.title = title;
		this.isLazy = true;
		this.key = key;
		this.isFolder = false;
		if (type == "folder") {
			this.isFolder = true;
		} else {
			this.isLazy = false;
		}
	}

	function createFileModel(name, path, type) {

		return new FileModel(name, path, type);
	}

	var msgTout = null;
	function writeMessage(txt) {
		clearTimeout(msgTout);
		console.log(txt);
		try {
			$("#message-window span").html(txt);

			msgTout = setTimeout(function() {
				$("#message-window span").html("");
			}, 5000);
		} catch (ex) {
			console.log("could not write message to window");
		}
	}

	function writeBusy(txt) {
		console.log(txt);
		try {
			$("#message-window span").html(txt);
			$("#message-window img").show();
		} catch (ex) {
			console.log("could not write message to window");
		}
	}

	function clearBusy() {
		try {
			$("#message-window span").html("");
			$("#message-window img").hide();
		} catch (ex) {

		}
	}

	function modifyCopyName(nameIn, ind) {
		var name = "";
		var nameToks = nameIn.split(".");
		switch (nameIn.indexOf(".")) {
		case -1:
			name += nameIn + "_copy";
			if (ind && ind > 1) {
				name += "_" + ind;
			}
			break;
		case 0:
			name += ".";
			var k = 1;
			if (nameToks.length == 2) {
				name += nameToks[k] + "_copy";
				if (ind && ind > 1) {
					name += "_" + ind;
				}
			} else {
				for (k; k < nameToks.length - 2; k++) {
					name += nameToks[k] + ".";
				}
				name += nameToks[k++] + "_copy";
				if (ind && ind > 1) {
					name += "_" + ind;
				}
				name += "." + nameToks[k];
			}
			break;
		default:
			var k = 0;
			for (k; k < nameToks.length - 2; k++) {
				name += nameToks[k] + ".";
			}
			name += nameToks[k++] + "_copy";
			if (ind && ind > 1) {
				name += "_" + ind;
			}
			name += "." + nameToks[k];
			break;
		}
		return name;
	}

	function DBoxTree(needle, client) {
		var myself = this;
		this.copy = null;
		this.needle = needle;
		this.client = client;

		function loadLazy(node, callback) {
			var path = node.data.key;
			node.setLazyNodeStatus(DTNodeStatus_Loading);

			client.readdir(path, function(error, entries, folderStat, childrenStat) {
				if (error) {
					return node.setLazyNodeStatus(DTNodeStatus_Error, {
						tooltip : error.toString(),
						info : error.toString()
					});
				}
				var data = [];
				for ( var j in childrenStat) {
					var cName = childrenStat[j].name;
					var cPath = path + "/" + cName;
					var type = (childrenStat[j].isFolder) ? "folder" : "file";
					var dd = createFileModel(cName, cPath, type);
					data.push(dd);
				}
				// PWS status OK
				node.addChild(data);
				node.setLazyNodeStatus(DTNodeStatus_Ok);

				var event = "nodeLoaded.dynatree." + node.tree.$tree.attr("id") + "." + node.data.key;
				node.tree.$tree.trigger(event, [ node, true ]);
			});
		}

		function getInitialState(callback) {
			var path = "";

			client.readdir(path, function(error, entries, folderStat, childrenStat) {
				if (error) {
					return callback(error);
				}
				var data = [];
				for ( var j in childrenStat) {
					var cName = childrenStat[j].name;
					var cPath = path + "/" + cName;
					var type = (childrenStat[j].isFolder) ? "folder" : "file";
					var dd = createFileModel(cName, cPath, type);
					data.push(dd);
				}
				// PWS status OK
				callback(null, data);
			});
		}

		// create the tree
		getInitialState(function(err, data) {

			if (err) {
				$(myself).trigger("error", err);
			} else {
				myself.tree = $(needle).dynatree({
					children : data,
					clickFolderMode : 1,
					selectMode : 3,
					onLazyRead : function(node, callback) {
						return loadLazy(node, callback);
					},
					onQueryExpand : function(flag, node) {
						// if opening, reset the lazy flag so that it reopens
						// from server
						if (flag) {
							node.resetLazy();
						}
					},
					onDblClick : function(node, event) {
						$(myself).trigger("doubleClick", node, event);
					},
					dnd : {
						onDragStart : function(node) {
							/**
							 * This function MUST be defined to enable dragging
							 * for the tree. Return false to cancel dragging of
							 * node.
							 */
							console.log("tree.onDragStart(%o)", node);
							return true;
						},
						onDragStop : function(node) {
							// This function is optional.
							console.log("tree.onDragStop(%o)", node);
						},
						autoExpandMS : 1000,
						preventVoidMoves : true, // Prevent dropping nodes
													// 'before self', etc.
						onDragEnter : function(node, sourceNode) {
							/**
							 * sourceNode may be null for non-dynatree
							 * droppables. Return false to disallow dropping on
							 * node. In this case onDragOver and onDragLeave are
							 * not called. Return 'over', 'before, or 'after' to
							 * force a hitMode. Return ['before', 'after'] to
							 * restrict available hitModes. Any other return
							 * value will calc the hitMode from the cursor
							 * position.
							 */
							console.log("tree.onDragEnter(%o, %o)", node, sourceNode);
							return true;
						},
						onDragOver : function(node, sourceNode, hitMode) {
							/**
							 * Return false to disallow dropping this node.
							 * 
							 */
//							console.log("tree.onDragOver(%o, %o, %o)", node, sourceNode, hitMode);
//							// Prevent dropping a parent below it's own child
//							if (node.isDescendantOf(sourceNode)) {
//								return false;
//							}
//							// Prohibit creating childs in non-folders (only
//							// sorting allowed)
//							if (!node.data.isFolder && hitMode === "over") {
//								return "after";
//							}
						},
						onDrop : function(node, sourceNode, hitMode, ui, draggable) {
							/**
							 * This function MUST be defined to enable dropping
							 * of items on the tree.
							 */
							console.log("tree.onDrop(%o, %o, %s)", node, sourceNode, hitMode);
							sourceNode.move(node, hitMode);
							// expand the drop target
							// sourceNode.expand(true);
						},
						onDragLeave : function(node, sourceNode) {
							/**
							 * Always called if onDragEnter was called.
							 */
							console.log("tree.onDragLeave(%o, %o)", node, sourceNode);
						}
					}
				});
				var rootNode = $("#tree").dynatree("getRoot");
				rootNode.data.key = "/";
				rootNode.data.isFolder = true;
				$(myself).trigger("loaded");
			}
		});
	}

	DBoxTree.prototype.fileOpen = function fileOpen() {
		var path, node, callback;
		try {
			switch (arguments.length) {
			case 1:
				node = $(this.needle).dynatree("getActiveNode");
				path = node.data.key;
				callback = arguments[0];
				break;
			default:
			case 2:
				callback = arguments[1];
				if (typeof arguments[0] == "string") {
					path = arguments[0];
					node = $(this.needle).dyself.needle("getTree").getNodeByKey(path);
				} else {
					node = arguments[0];
					path = node.data.key;
				}
			}
		} catch (ex) {
			callback(ex.toString());
		}

		if (node.data.isFolder) {
			node.expand(true);
			callback(null, path, null);
		} else {
			writeBusy("Opening file at " + node.data.key);
			this.client.readFile(path, function(error, data) {
				clearBusy();
				if (error) {
					callback(error);
				} else {
					callback(null, path, data);
				}

			});
		}
	};

	DBoxTree.prototype.fileSave = function fileSave(path, data, callback) {
		writeBusy("Saving file at " + path);
		this.client.writeFile(path, data, function(err, data) {
			clearBusy();
			writeMessage("Saved file at " + path);
			callback(err, data);
		});
	};

	DBoxTree.prototype.fileRename = function fileRename(callback) {
		var myself = this;
		var node = $(this.needle).dynatree("getActiveNode");
		node.setLazyNodeStatus(DTNodeStatus_Loading);

		var prevTitle = node.data.title;
		var fromPath = node.data.key;
		var tree = node.tree;
		var siblings = node.getParent().getChildren();
		var siblingNames = [];
		for ( var i in siblings) {
			siblingNames.push(siblings[i].data.title);
		}
		siblingNames.slice(siblingNames.indexOf(prevTitle), 1);

		// Disable dynatree mouse- and key handling
		tree.$widget.unbind();
		// Replace node with <input>
		$(".dynatree-title", node.span).html("<input id='editNode' value='" + prevTitle + "'>");
		// Focus <input> and bind keyboard handler
		$("input#editNode").focus().keydown(function(event) {
			switch (event.which) {
			case 27: // [esc]
				// discard changes on [esc]
				$("input#editNode").val(prevTitle);
				$(this).blur();
				break;
			case 13: // [enter]
				// simulate blur to accept new value
				$(this).blur();
				break;
			}
		}).blur(function(event) {
			// Accept new value, when user leaves <input>
			var title = $("input#editNode").val();
			if (siblingNames.indexOf(title) != -1) {
				title = prevTitle;
				$("input#editNode").val(title);
				node.setTitle(title);
				tree.$widget.bind();
				node.focus();
				node.getParent().sortChildren();
				node.setLazyNodeStatus(DTNodeStatus_Ok);
				return writeMessage("Alreay a file with that name. Reverting.");
			}
			var toks = fromPath.split("/");
			var toPath = "";
			for ( var i = 0; i < toks.length - 1; i++) {
				toPath += toks[i] + "/";
			}
			toPath += title;
			writeBusy("Renaming file");
			myself.client.move(fromPath, toPath, function(err) {
				clearBusy();
				if (err) {
					console.log("error:", err.toString());
					node.setTitle(prevTitle);
					node.setLazyNodeStatus(DTNodeStatus_Error, {
						tooltip : error.toString(),
						info : error.toString()
					});
				} else {
					node.setTitle(title);
					node.data.key = toPath;
					node.setLazyNodeStatus(DTNodeStatus_Ok);
				}
				node.getParent().sortChildren();
				// Re-enable mouse and keyboard handlling
				tree.$widget.bind();
				node.focus();
				try {
					callback(err, fromPath, toPath);
				} catch (ex) {
					console.log("error on callback");
				}
			});
		});
	};

	DBoxTree.prototype.fileDelete = function fileDelete() {
		var node = $(this.needle).dynatree("getActiveNode");
		node.setLazyNodeStatus(DTNodeStatus_Loading);

		var path = node.data.key;
		writeBusy("Deleting file at " + path);
		this.client.remove(path, function(err) {
			clearBusy();
			if (err) {
				node.setLazyNodeStatus(DTNodeStatus_Error, {
					tooltip : err.toString(),
					info : err.toString()
				});
			} else {
				node.remove();
				node.setLazyNodeStatus(DTNodeStatus_Ok);
			}
		});
	};

	DBoxTree.prototype.fileCopy = function fileCopy() {
		this.copy = $(this.needle).dynatree("getActiveNode");
		writeMessage("Coppied file " + this.copy.data.key);
	};

	DBoxTree.prototype.filePaste = function filePaste() {
		var myself = this;

		if (this.copy == null) {
			return writeMessage("Could not paste. Nothing on clipboard.");
		}
		var parent = $(this.needle).dynatree("getActiveNode");
		var parentPath = parent.data.key;
		var nodePath = this.copy.data.key;
		if (parentPath == nodePath) {
			parent = parent.getParent();
			parentPath = parent.data.key;
		}
		if (!parent.data.isFolder && parentPath != "_1") {
			parent = parent.getParent();
			parentPath = parent.data.key;
		}
		// root node
		if (parentPath == "_1") {
			parentPath = "";
		}

		var children = parent.getChildren();
		var childrenNames = [];
		for ( var i in children) {
			childrenNames.push(children[i].data.title);
		}
		var name = this.copy.data.title;
		if (this.copy) {
			this.copy.setLazyNodeStatus(DTNodeStatus_Loading);
		} else {
			return;
		}
		var origName = name;
		var k = 1;
		while (childrenNames.indexOf(name) != -1) {
			name = modifyCopyName(origName, k++);
		}
		var finalPath = parentPath + "/" + name;
		writeBusy("Pasting file to " + parentPath);
		this.client.copy(nodePath, finalPath, function(err) {
			clearBusy();
			if (err) {
				writeMessage("Dropbox could not copy.");
			}
			var dd = {
				title : name,
				key : finalPath
			};
			if (myself.copy.data.isFolder) {
				dd.isLazy = true;
				dd.isFolder = true;
			}
			myself.copy.setLazyNodeStatus(DTNodeStatus_Ok);
			parent.addChild(dd);
			// parent.expand(true);
			parent.sortChildren();
			writeMessage("Paste successful");
		});
	};

	DBoxTree.prototype.fileNew = function fileNew(type) {
		var myself = this;
		var parent = $(this.needle).dynatree("getActiveNode");

		var path;
		if (parent && parent.data.key) {
			path = parent.data.key;

			if (!parent.data.isFolder) {
				parent = parent.getParent();
				path = parent.data.key;
			}
		} else {
			parent = $(this.needle).dynatree("getRoot");
			path = "";
		}

		var children = parent.getChildren();
		var childrenNames = [];
		for ( var i in children) {
			childrenNames.push(children[i].data.title);
		}
		var name = "untitled";
		var origName = name;
		var k = 1;
		while (childrenNames.indexOf(name) != -1) {
			name = modifyCopyName(origName, k++);
		}
		path += ("/" + name);

		writeBusy("Creating new file");

		// the function that makes the file or folder
		function makeIt(node) {

			node.activate();
			if (type == "folder") {
				myself.client.mkdir(path, function(err, stat) {
					clearBusy();
					if (err) {
						writeMessage("Error in creation");
						return console.log("error:", err.toString());
					}
					parent.addChild(createFileModel(name, path, type));
					$(myself.needle).dynatree("getTree").activateKey(path);
					myself.fileRename();
				});
			} else {
				myself.client.writeFile(path, "", null, function(err, stat) {
					clearBusy();
					if (err) {
						writeMessage("Error in creation");
						return console.log("error:", err.toString());
					}
					parent.addChild(createFileModel(name, path, type));
					$(myself.needle).dynatree("getTree").activateKey(path);
					myself.fileRename();
				});
			}
		}

		if (!parent.isExpanded()) {
			parent.reloadChildren(function(node, status) {
				node.expand(true);
				makeIt(node);
			});
		} else {
			makeIt(parent);
		}
	};

	function createTree(needle, client, callback) {

		client.getUserInfo(function(error, accountInfo) {
			if (error) {
				return showError(error); // Something went wrong.
			}
			console.log(accountInfo);
		});

		var tree = new DBoxTree(needle, client);
		$(tree).one("loaded", function() {
			callback(null, tree);
		});
	}

	dtree.createTree = createTree;
})();