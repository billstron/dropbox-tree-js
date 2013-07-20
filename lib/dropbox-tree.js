(function() {

	if (typeof dtree == "undefined") {
		dtree = {};
	}

	function DBoxTree(needle, client) {
		var self = this;
		var copy = null;

		this.getTree = function getTree(node) {
			console.log("Lazyloading:", node.data.title);
			var path = node.data.key;
			node.setLazyNodeStatus(DTNodeStatus_Loading);

			client.readdir(path, function(error, entries, folderStat, childrenStat) {
				if (error) {
					return node.setLazyNodeStatus(DTNodeStatus_Error, {
						tooltip : data.faultDetails,
						info : data.faultString
					});
				}
				var data = [];
				for ( var j in childrenStat) {
					var cName = childrenStat[j].name;
					var cPath = path + "/" + cName;
					var type = (childrenStat[j].isFolder) ? "folder" : "file";
					var dd = getJson(cName, cPath, type);
					data.push(dd);
				}
				// PWS status OK
				node.setLazyNodeStatus(DTNodeStatus_Ok);
				node.addChild(data);
			});
		};

		var msgTout = null;
		this.writeMessage = function writeMessage(txt) {
			clearTimeout(msgTout);
			$("#message-window span").html(txt);
			msgTout = setTimeout(function() {
				$("#message-window span").html("");
			}, 5000);
		};

		this.filePaste = function filePaste() {
			console.log("pasting node");

			if (copy == null) {
				return 1;
			}
			var parent = $(needle).dynatree("getActiveNode");
			var parentPath = parent.data.key;
			var nodePath = copy.data.key;
			if (parentPath == nodePath) {
				parent = parent.getParent();
				parentPath = parent.data.key;
			}
			parent.setLazyNodeStatus(DTNodeStatus_Loading);

			var children = parent.getChildren();
			var childrenNames = [];
			for ( var i in children) {
				childrenNames.push(children[i].data.title);
			}
			var name = copy.data.title;
			var origName = name;
			var k = 1;
			while (childrenNames.indexOf(name) != -1) {
				name = modifyCopyName(origName, k++);
			}
			var finalPath = parentPath + "/" + name;
			client.copy(nodePath, finalPath, function(err) {
				if (err) {
					self.writeMessage("Dropbox could not copy.");
				}
				var dd = {
					title : name,
					key : finalPath
				};
				if (copy.data.isFolder) {
					dd.isLazy = true;
					dd.isFolder = true;
				}
				parent.addChild(dd);
				parent.expand(true);
				parent.sortChildren();
				node.setLazyNodeStatus(DTNodeStatus_Ok);
				console.log("paste successful");
			});
		};

		this.fileCopy = function fileCopy() {
			console.log("copying node");
			copy = $(needle).dynatree("getActiveNode");
		};

		this.fileDelete = function fileDelete() {
			var node = $(needle).dynatree("getActiveNode");
			node.setLazyNodeStatus(DTNodeStatus_Loading);

			var parent = node.getParent();
			var path = node.data.key;
			console.log("trying to delete file: ", path);
			client.remove(path, function(err) {
				if (err) {
					return self.writeMessage("Dropbox could not remove.");
				}
				node.remove();
				node.setLazyNodeStatus(DTNodeStatus_Ok);
			});
		};

		this.fileNew = function fileNew(type) {
			var parent = $(needle).dynatree("getActiveNode");

			var path;
			if (parent && parent.data.key) {
				path = parent.data.key;
			} else {
				parent = $(needle).dynatree("getRoot");
				path = "/";
			}

			if (!parent.data.isFolder) {
				parent = parent.getParent();
				path = parent.data.key;
			}
			parent.setLazyNodeStatus(DTNodeStatus_Loading);

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

			if (type == "folder") {
				client.mkdir(path, function(err, stat) {
					if (err) {
						this.writeMessage("Error in creation");
						return console.log("error:", err.toString());
					}
					parent.addChild(getJson(name, path, type));
					$(needle).dynatree("getTree").activateKey(path);
					self.fileRename();
					node.setLazyNodeStatus(DTNodeStatus_Ok);
				});
			} else {
				client.writeFile(path, "", null, function(err, stat) {
					if (err) {
						this.writeMessage("Error in creation");
						return console.log("error:", err.toString());
					}
					parent.addChild(getJson(name, path, type));
					$(needle).dynatree("getTree").activateKey(path);
					self.fileRename();
					node.setLazyNodeStatus(DTNodeStatus_Ok);
				});
			}
		};

		this.fileOpen = function fileOpen(node) {
			if (!node) {
				node = $(needle).dynatree("getActiveNode");
			}

			var path = node.data.key;
			if (node.data.isFolder) {
				node.expand(true);
			} else {
				client.readFile(path, function(error, data) {
					if (error) {
						return console.log("error:", error);
					}
					$("#editor-window").html(data);
				});
			}
		};

		this.fileRename = function fileRename() {
			var node = $(needle).dynatree("getActiveNode");
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
					return self.writeMessage("Alreay a file with that name. Reverting.");
				}
				var toks = fromPath.split("/");
				var toPath = "";
				for ( var i = 0; i < toks.length - 1; i++) {
					toPath += toks[i] + "/";
				}
				toPath += title;
				client.move(fromPath, toPath, function(err) {
					if (err) {
						console.log("error:", err.toString());
						node.setTitle(prevTitle);
					} else {
						node.setTitle(title);
					}
					node.getParent().sortChildren();
					// Re-enable mouse and keyboard handlling
					tree.$widget.bind();
					node.focus();
					node.setLazyNodeStatus(DTNodeStatus_Ok);
				});
			});
		};

		var k = 0;
		this.tree = $(needle).dynatree({
			children : [ {
				title : "Dropbox",
				isLazy : true,
				isFolder : true,
				key : "/"
			} ],
			clickFolderMode : 1,
			selectMode : 3,
			onLazyRead : this.getTree.bind(this),
			onPostInit : function(isReloading, isError) {
				if (k++ < 1) {
					$(needle).trigger("load");
				} else {
					$(needle).trigger("reload");
				}
			},
			onQueryExpand : function(flag, node) {
				console.log("flag:", flag);
				if (flag) {
					node.resetLazy();
				}
			},
			onDblClick : function(node, event) {
				self.fileOpen(node);
			}
		});

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

	function getJson(name, path, type) {
		var dd = {
			title : name,
			isLazy : true,
			key : path
		};
		if (type == "folder") {
			dd.isFolder = true;
		} else {
			dd.isLazy = false;
		}

		return dd;
	}

	function createTree(needle, client, callback) {

		client.getUserInfo(function(error, accountInfo) {
			if (error) {
				return showError(error); // Something went wrong.
			}
			console.log(accountInfo);
		});

		var onLoad = function() {
			if (callback) {
				callback();
			}
			callabck = null;
			$(needle).unbind("load", onLoad);
		};
		$(needle).bind("load", onLoad);

		var tree = new DBoxTree(needle, client);
		tree.writeMessage("loading");

		return tree;
	}

	dtree.createTree = createTree;
})();